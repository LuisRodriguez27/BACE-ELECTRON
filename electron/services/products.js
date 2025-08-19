const db = require('../db');

function getAllProducts() {
	const stmt = db.prepare('SELECT * FROM products');
	return stmt.all();
}

function getProductById(id) {
	const stmt = db.prepare('SELECT * FROM products WHERE id = ?');
	return stmt.get(id);
}

function createProduct(name, serialNumber, price, description) {
	const stmt = db.prepare('INSERT INTO products (name, serial_number, price, description) VALUES (?, ?, ?, ?)');
	const info = stmt.run(name, serialNumber, price, description);
	return { id: info.lastInsertRowid, name };
}

function updateProduct(id, name, serialNumber, price, description) {
	const stmt = db.prepare('UPDATE products SET name = ?, serial_number = ?, price = ?, description = ? WHERE id = ?');
	const info = stmt.run(name, serialNumber, price, description, id);
	
	if (info.changes > 0) {
		return { success: true, message: 'Producto actualizado exitosamente' }, getProductById(id);
	} else {
		return { success: false, message: 'Producto no encontrado' };
	}
}

function deleteProduct(id) {
	const stmt = db.prepare('DELETE FROM products WHERE id = ?');
	const info = stmt.run(id);

	if (info.changes > 0) {
		return { success: true, message: 'Producto eliminado exitosamente' };
	} else {
		return { success: false, message: 'Producto no encontrado' };
	}
}

module.exports = {
	getAllProducts,
	getProductById,
	createProduct,
	updateProduct,
	deleteProduct
};