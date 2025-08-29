const db = require('../db');

function getAllProducts() {
	const stmt = db.prepare('SELECT * FROM products WHERE active = 1');
	return stmt.all();
}

function getProductById(id) {
	const stmt = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1');
	return stmt.get(id);
}

function getActiveProducts() {
	const stmt = db.prepare('SELECT * FROM products WHERE active = 1');
	return stmt.all();
}	

function getInactiveProducts() {
	const stmt = db.prepare('SELECT * FROM products WHERE active = 0');
	return stmt.all();
}

function createProduct({ name, serial_number, price, description, width, height, colors, position }) {
	const stmt = db.prepare('INSERT INTO products (name, serial_number, price, description, width, height, colors, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
	
	// Convertir colors a string si es un objeto/array
	const colorsString = typeof colors === 'string' ? colors : JSON.stringify(colors || null);
	
	const result = stmt.run(name, serial_number, price, description, width || null, height || null, colorsString, position || null);

	return { 
		id: result.lastInsertRowid, 
		name, 
		serial_number, 
		price, 
		description, 
		width: width || null,
		height: height || null,
		colors: colorsString,
		position: position || null,
		active: 1 
	};
}

function updateProduct(id, { name, serial_number, price, description, width, height, colors, position }) {
	const stmt = db.prepare('UPDATE products SET name = ?, serial_number = ?, price = ?, description = ?, width = ?, height = ?, colors = ?, position = ? WHERE id = ?');
	
	// Convertir colors a string si es un objeto/array
	const colorsString = typeof colors === 'string' ? colors : JSON.stringify(colors || null);
	
	const result = stmt.run(name, serial_number, price, description, width || null, height || null, colorsString, position || null, id);
	
	if (result.changes > 0) {
		return { success: true, message: 'Producto actualizado exitosamente', data: getProductById(id) };
	} else {
		return { success: false, message: 'Producto no encontrado' };
	}
}

function deleteProduct(id) {
	const stmt = db.prepare('UPDATE products SET active = 0 WHERE id = ?');
	const result = stmt.run(id);

	if (result.changes > 0) {
		return { success: true, message: 'Producto eliminado exitosamente' };
	} else {
		return { success: false, message: 'Producto no encontrado' };
	}
}

function removeProduct(id) {
	const stmt = db.prepare('DELETE FROM products WHERE id = ?');
	const result = stmt.run(id);

	if (result.changes > 0) {
		return { success: true, message: 'Producto eliminado permanentemente' };
	} else {
		return { success: false, message: 'Producto no encontrado' };
	}
}

module.exports = {
	getAllProducts,
	getProductById,
	getActiveProducts,
	getInactiveProducts,
	createProduct,
	updateProduct,
	deleteProduct,
	removeProduct
};