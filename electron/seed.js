const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../sqlite/data.db');
const db = new Database(dbPath);

// 1. Crear la tabla si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    description TEXT
  );
`);

// 2. Insertar registros de prueba
const insert = db.prepare('INSERT INTO clients (name, phone, address, description) VALUES (?, ?, ?, ?)');

insert.run('Juan Pérez', '555-1234', 'Calle Falsa 123', 'Cliente frecuente');
insert.run('María Gómez', '555-5678', 'Avenida Siempre Viva 742', 'Prefiere contacto por WhatsApp');


console.log('Base de datos inicializada con datos de ejemplo.');
