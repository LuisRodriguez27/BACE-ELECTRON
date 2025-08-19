const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../sqlite/data.db');
const db = new Database(dbPath);

// 1. Crear la tabla si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 2. Insertar registros de prueba
const insert = db.prepare('INSERT INTO tasks (description) VALUES (?)');

const tasks = [
  'Aprender Electron + React',
  'Configurar base de datos',
  'Hacer consulta real'
];

tasks.forEach(task => {
  insert.run(task);
});

console.log('Base de datos inicializada con datos de ejemplo.');
