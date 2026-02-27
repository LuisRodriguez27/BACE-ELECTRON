const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'testdb',
  password: '1234',
  port: 5432,
});
async function fix() {
  await pool.query('ALTER TABLE budget_products ALTER COLUMN quantity TYPE DECIMAL(10,4)');
  console.log('Fixed quantity type');
  process.exit(0);
}
fix();
