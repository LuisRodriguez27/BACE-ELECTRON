const { Pool, types } = require('pg');

// Forzar que los campos DECIMAL (OID 1700), float4 (700) y float8 (701) devuelvan Number
// ADVERTENCIA: Usar parseFloat con DECIMAL puede causar pérdida de precisión en centavos. 
// Para solucionarlo de raíz sin tirar prod, tendrías que cambiar tu frontend para que no use .toFixed() en numbers, sino manejar strings. Lo dejamos así para que no truene tu frontend actual.
types.setTypeParser(1700, val => parseFloat(val));
types.setTypeParser(700, val => parseFloat(val));
types.setTypeParser(701, val => parseFloat(val));

const { AsyncLocalStorage } = require('async_hooks');
const path = require('path');
const { app, dialog } = require('electron');
const fs = require('fs');
const { runMigrations } = require('./migrations');
const schemaTables  = require('./schemaTables');
const schemaIndexes = require('./schemaIndexes');

const isDev = !app.isPackaged;

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  user: isDev ? process.env.DEV_DB_USER : process.env.PROD_DB_USER,
  host: isDev ? process.env.DEV_DB_HOST : process.env.PROD_DB_HOST,
  database: isDev ? process.env.DEV_DB_NAME : process.env.PROD_DB_NAME,
  password: isDev ? process.env.DEV_DB_PASSWORD : process.env.PROD_DB_PASSWORD,
  port: parseInt(isDev ? process.env.DEV_DB_PORT : process.env.PROD_DB_PORT, 10),
});

const asyncLocalStorage = new AsyncLocalStorage();

const db = {
  async getOne(sql, params = []) {
    const client = asyncLocalStorage.getStore() || pool;
    try {
      const result = await client.query(sql, params);
      return result.rows[0] || null;
    } catch (e) {
      console.error("Database Error:", e.message, "\nQuery:", sql, "\nParams:", params);
      throw e;
    }
  },

  async getAll(sql, params = []) {
    const client = asyncLocalStorage.getStore() || pool;
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } catch (e) {
      console.error("Database Error:", e.message, "\nQuery:", sql, "\nParams:", params);
      throw e;
    }
  },

  async execute(sql, params = []) {
    let pgSql = sql;

    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
      pgSql += ' RETURNING *';
    }

    const client = asyncLocalStorage.getStore() || pool;
    try {
      const result = await client.query(pgSql, params);
      return {
        changes: result.rowCount,
        lastInsertRowid: result.rows.length > 0 && result.rows[0].id ? result.rows[0].id : null
      };
    } catch (e) {
      console.error("Database Error:", e.message, "\nQuery:", pgSql, "\nParams:", params);
      throw e;
    }
  },

  transaction: (fn) => {
    return async (...args) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await asyncLocalStorage.run(client, () => fn(...args));
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Transaction Failed, rolling back:', err);
        throw err;
      } finally {
        client.release();
      }
    };
  },

  async exec(sql) {
    const client = asyncLocalStorage.getStore() || pool;
    return await client.query(sql);
  }
};

async function initDb() {
  let client;
  try {
    client = await pool.connect();

    await client.query(schemaTables);
    await runMigrations(db, client);
    await client.query(schemaIndexes);

    console.log("✅ Base de datos PG Inicializada");
  } catch (e) {
    console.error("❌ Error inicializando Postgres DB:", e);
  } finally {
    if (client) client.release();
  }
}

initDb();

module.exports = db;
