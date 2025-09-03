// DEPRECATED: Este archivo ha sido reemplazado por el patrón Repository + Service Layer
// Nuevo patrón:
// - Domain: ../domain/product.js (entidad)
// - Repository: ../repositories/productRepository.js (acceso a datos)
// - Service: ../services/productService.js (lógica de negocio)
// Este archivo se mantiene por compatibilidad, pero no se usa más.

const db = require('../db');

function getAllProducts() {
	const stmt = db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY name');
	return stmt.all();
}

function getProductById(id) {
	const stmt = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1');
	return stmt.get(id);
}

function createProduct({ name, serial_number, price, description }) {
	const stmt = db.prepare(`
		INSERT INTO products (name, serial_number, price, description) 
		VALUES (?, ?, ?, ?)
	`);
	
	const result = stmt.run(
		name,
		serial_number,
		price,
		description
	);

	return { 
		id: result.lastInsertRowid, 
		name, 
		serial_number, 
		price, 
		description,
		active: 1 
	};
}

function updateProduct(id, { name, serial_number, price, description }) {
	const stmt = db.prepare(`
		UPDATE products 
		SET name = ?, serial_number = ?, price = ?, description = ?
		WHERE id = ?
	`);
	
	const result = stmt.run(
		name, 
		serial_number, 
		price, 
		description, 
		id
	);
	
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

// FUNCIONES AVANZADAS

function getProductWithTemplates(productId) {
	const product = getProductById(productId);
	if (!product) return null;

	const templates = db.prepare(`
		SELECT pt.*, u.username as created_by_username
		FROM product_templates pt
		LEFT JOIN users u ON pt.created_by = u.id
		WHERE pt.product_id = ?
	`).all(productId);

	return {
		...product,
		templates
	};
}

function searchProducts(searchTerm) {
	const stmt = db.prepare(`
		SELECT * FROM products 
		WHERE active = 1 
		AND (name LIKE ? OR serial_number LIKE ?)
		ORDER BY name
	`);
	const term = `%${searchTerm}%`;
	return stmt.all(term, term);
}


module.exports = {
	// CRUD básico
	getAllProducts,
	getProductById,
	createProduct,
	updateProduct,
	deleteProduct,
	
	// Funciones avanzadas
	getProductWithTemplates,
	searchProducts,
};