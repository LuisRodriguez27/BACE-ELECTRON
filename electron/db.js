const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../sqlite/data.db');
const db = new Database(dbPath);

// Ejemplo de consulta real
function getTasks() {
  const stmt = db.prepare('SELECT * FROM tasks');
  return stmt.all();
}

module.exports = { getTasks };
