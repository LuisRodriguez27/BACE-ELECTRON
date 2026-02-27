const fs = require('fs');

let pgDb = `const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'testdb',
  password: '1234',
  port: 5432,
});

// Helper para convertir ? a $1, $2, etc y auto-añadir RETURNING id
function processSql(sql) {
  let i = 1;
  let pgSql = sql.replace(/\\?/g, () => \`$\${i++}\`);
  
  if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
    pgSql += ' RETURNING id';
  }
  return pgSql;
}

const dbAdapter = {
  prepare: (sql) => {
    const pgSql = processSql(sql);
    
    return {
      get: async (...args) => {
        const result = await pool.query(pgSql, args);
        return result.rows[0] || null;
      },
      all: async (...args) => {
        const result = await pool.query(pgSql, args);
        return result.rows;
      },
      run: async (...args) => {
        const result = await pool.query(pgSql, args);
        return {
          changes: result.rowCount,
          lastInsertRowid: result.rows.length > 0 ? result.rows[0].id : null
        };
      }
    };
  },
  transaction: (fn) => {
    return async (...args) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // We inject the transaction context?
        // Wait, in sqlite better-sqlite3, transactions are synchronous and use the same connection.
        // Doing 'BEGIN' on 'client' connection won't affect 'pool.query' used by db.prepare because pool.query gets a random connection!
        // This is a problem. If they used db.prepare inside transaction(), it's using pool.query which is not inside the 'client' connection transaction!
        const result = await fn(...args);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    };
  }
};

module.exports = dbAdapter;
\`;

fs.writeFileSync('./electron/db.js', pgDb);
console.log('db.js rewritten for pg with adapter');
