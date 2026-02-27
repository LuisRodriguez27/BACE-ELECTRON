const db = require('./electron/db');

async function test() {
  const result = await db.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1', ['users']);
  console.log('users table:', result.rows);
  
  const permissions = await db.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1', ['permissions']);
  console.log('permissions table:', permissions.rows);
  
  const budgets = await db.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1', ['budgets']);
  console.log('budgets table:', budgets.rows);
  
  process.exit(0);
}
setTimeout(test, 1000);
