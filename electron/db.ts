import { Pool, PoolClient, types, QueryResultRow } from 'pg';
import { AsyncLocalStorage } from 'async_hooks';
import * as path from 'path';
import { app } from 'electron';
import { runMigrations } from './migrations';
import type { Db, DbExecuteResult } from './types/db';

import schemaTables from './schemaTables';
import schemaIndexes from './schemaIndexes';

// Forzar que los campos DECIMAL (OID 1700), float4 (700) y float8 (701) devuelvan Number.
// ADVERTENCIA: Usar parseFloat con DECIMAL puede causar pérdida de precisión en centavos.
// Para solucionarlo de raíz sin tirar prod, tendrías que cambiar tu frontend para que no
// use .toFixed() en numbers, sino manejar strings. Lo dejamos así para no romper el frontend.
types.setTypeParser(1700, (val: string) => parseFloat(val));
types.setTypeParser(700,  (val: string) => parseFloat(val));
types.setTypeParser(701,  (val: string) => parseFloat(val));


const isDev = !app.isPackaged;

const pool = new Pool({
  user:     isDev ? process.env.DEV_DB_USER     : process.env.PROD_DB_USER,
  host:     isDev ? process.env.DEV_DB_HOST     : process.env.PROD_DB_HOST,
  database: isDev ? process.env.DEV_DB_NAME     : process.env.PROD_DB_NAME,
  password: isDev ? process.env.DEV_DB_PASSWORD : process.env.PROD_DB_PASSWORD,
  port:     parseInt(
    (isDev ? process.env.DEV_DB_PORT : process.env.PROD_DB_PORT) ?? '5432',
    10
  ),
});

const asyncLocalStorage = new AsyncLocalStorage<PoolClient>();

const db: Db = {
  async getOne<T extends QueryResultRow = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<T | null> {
    const client = asyncLocalStorage.getStore() ?? pool;
    try {
      const result = await client.query<T>(sql, params);
      return result.rows[0] ?? null;
    } catch (e) {
      const err = e as Error;
      console.error('Database Error:', err.message, '\nQuery:', sql, '\nParams:', params);
      throw e;
    }
  },

  async getAll<T extends QueryResultRow = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<T[]> {
    const client = asyncLocalStorage.getStore() ?? pool;
    try {
      const result = await client.query<T>(sql, params);
      return result.rows;
    } catch (e) {
      const err = e as Error;
      console.error('Database Error:', err.message, '\nQuery:', sql, '\nParams:', params);
      throw e;
    }
  },

  async execute(sql: string, params: unknown[] = []): Promise<DbExecuteResult> {
    let pgSql = sql;

    // Los INSERT reciben RETURNING * automáticamente si no lo especifican
    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
      pgSql += ' RETURNING *';
    }

    const client = asyncLocalStorage.getStore() ?? pool;
    try {
      const result = await client.query(pgSql, params);
      return {
        changes: result.rowCount,
        lastInsertRowid:
          result.rows.length > 0 && result.rows[0].id ? result.rows[0].id : null,
      };
    } catch (e) {
      const err = e as Error;
      console.error('Database Error:', err.message, '\nQuery:', pgSql, '\nParams:', params);
      throw e;
    }
  },

  transaction<T>(fn: (...args: unknown[]) => Promise<T>) {
    return async (...args: unknown[]): Promise<T> => {
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

  async exec(sql: string): Promise<unknown> {
    const client = asyncLocalStorage.getStore() ?? pool;
    return await client.query(sql);
  },
};

export async function initDb(): Promise<void> {
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();

    await client.query(schemaTables);
    await runMigrations(db, client);
    await client.query(schemaIndexes);

    console.log('✅ Base de datos PG Inicializada');
  } catch (e) {
    console.error('❌ Error inicializando Postgres DB:', e);
  } finally {
    if (client) client.release();
  }
}

export default db;

