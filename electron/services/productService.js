const productRepository = require('../repositories/productRepository');
const SimilarProductNames = require('../domain/similarProductNames');

class ProductService {

  async getAllProducts() {
    try {
      const products = await productRepository.findAll();
      return products.map(product => product.toPlainObject());
    } catch (error) {
      console.error('Error al obtener productos:', error);
      throw new Error('Error al obtener productos');
    }
  }

  async getProductById(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de producto inválido');
      }

      const product = await productRepository.findById(parseInt(id));

      if (!product) {
        throw new Error('Producto no encontrado');
      }

      return product.toPlainObject();
    } catch (error) {
      console.error('Error al obtener producto:', error);
      throw error;
    }
  }

  async createProduct({ name, serial_number, price, promo_price, discount_price, description }) {
    try {
      // Validaciones de negocio
      if (!name) {
        throw new Error('El nombre del producto es requerido');
      }

      if (name.trim().length < 1) {
        throw new Error('El nombre del producto no puede estar vacío');
      }

      // Validar precio
      if (price === undefined || price === null || isNaN(price)) {
        throw new Error('El precio es requerido y debe ser un número válido');
      }

      const numericPrice = parseFloat(price);
      if (numericPrice < 0) {
        throw new Error('El precio debe ser mayor o igual a cero');
      }

      // Validar número de serie si se proporciona
      if (serial_number && serial_number.trim() !== '') {
        // Verificar si el número de serie ya existe
        if (await productRepository.existsBySerialNumber(serial_number.trim())) {
          throw new Error('Ya existe un producto con este número de serie');
        }
      }

      // Crear producto
      const product = await productRepository.create({
        name: name.trim(),
        serial_number: serial_number?.trim() || null,
        price: numericPrice,
        promo_price: promo_price !== undefined && promo_price !== null && promo_price !== '' ? parseFloat(promo_price) : null,
        discount_price: discount_price !== undefined && discount_price !== null && discount_price !== '' ? parseFloat(discount_price) : null,
        description: description?.trim() || null
      });

      return product.toPlainObject();

    } catch (error) {
      console.error('Error al crear producto:', error);
      throw error;
    }
  }

  async updateProduct(id, { name, serial_number, price, promo_price, discount_price, description }) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de producto inválido');
      }

      if (!name) {
        throw new Error('El nombre del producto es requerido');
      }

      if (name.trim().length < 1) {
        throw new Error('El nombre del producto no puede estar vacío');
      }

      const productId = parseInt(id);

      // Verificar si el producto existe
      const existingProduct = await productRepository.findById(productId);
      if (!existingProduct) {
        throw new Error('Producto no encontrado');
      }

      // Validar precio
      if (price === undefined || price === null || isNaN(price)) {
        throw new Error('El precio es requerido y debe ser un número válido');
      }

      const numericPrice = parseFloat(price);
      if (numericPrice < 0) {
        throw new Error('El precio debe ser mayor o igual a cero');
      }

      // Validar número de serie si se proporciona
      if (serial_number && serial_number.trim() !== '') {
        // Verificar si el número de serie ya está en uso por otro producto
        if (await productRepository.existsBySerialNumber(serial_number.trim(), productId)) {
          throw new Error('Ya existe otro producto con este número de serie');
        }
      }

      // Actualizar producto
      const updated = await productRepository.update(productId, {
        name: name.trim(),
        serial_number: serial_number?.trim() || null,
        price: numericPrice,
        promo_price: promo_price !== undefined && promo_price !== null && promo_price !== '' ? parseFloat(promo_price) : null,
        discount_price: discount_price !== undefined && discount_price !== null && discount_price !== '' ? parseFloat(discount_price) : null,
        description: description?.trim() || null
      });

      if (!updated) {
        throw new Error('Error al actualizar producto');
      }

      // Obtener producto actualizado
      const updatedProduct = await productRepository.findById(productId);

      if (!updatedProduct) {
        throw new Error('Error: no se pudo recuperar el producto actualizado');
      }

      const result = updatedProduct.toPlainObject();

      // Validar que el resultado tenga las propiedades necesarias
      if (!result.id || !result.name) {
        console.error('Producto actualizado inválido:', result);
        throw new Error('Datos del producto actualizado inválidos');
      }

      return result;

    } catch (error) {
      console.error('Error al actualizar producto:', error);
      throw error;
    }
  }

  async deleteProduct(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de producto inválido');
      }

      const productId = parseInt(id);

      // Verificar si el producto existe
      const existingProduct = await productRepository.findById(productId);
      if (!existingProduct) {
        throw new Error('Producto no encontrado');
      }

      const deleted = await productRepository.delete(productId);

      if (!deleted) {
        throw new Error('Error al eliminar producto');
      }

      // El frontend espera void, no retornamos nada
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      throw error;
    }
  }

  async searchProducts(searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return this.getAllProducts();
      }

      const products = await productRepository.searchByTerm(searchTerm.trim());
      return products.map(product => product.toPlainObject());
    } catch (error) {
      console.error('Error al buscar productos:', error);
      throw new Error('Error al buscar productos');
    }
  }

  async getProductsCount() {
    try {
      return await productRepository.countActiveProducts();
    } catch (error) {
      console.error('Error al contar productos:', error);
      throw new Error('Error al contar productos');
    }
  }

  async getProductWithTemplates(productId) {
    try {
      if (!productId || isNaN(productId)) {
        throw new Error('ID de producto inválido');
      }

      const productWithTemplates = await productRepository.findWithTemplates(parseInt(productId));
      
      if (!productWithTemplates) {
        throw new Error('Producto no encontrado');
      }

      return productWithTemplates;
    } catch (error) {
      console.error('Error al obtener producto con plantillas:', error);
      throw error;
    }
  }

  async getAllProductsWithTemplates() {
    try {
      return await productRepository.findAllWithTemplates();
    } catch (error) {
      console.error('Error al obtener productos con plantillas:', error);
      throw new Error('Error al obtener productos con plantillas');
    }
  }

  async getProductsByPriceRange(minPrice, maxPrice) {
    try {
      if (isNaN(minPrice) || isNaN(maxPrice)) {
        throw new Error('Los precios deben ser números válidos');
      }

      if (minPrice < 0 || maxPrice < 0) {
        throw new Error('Los precios deben ser mayores o iguales a cero');
      }

      if (minPrice > maxPrice) {
        throw new Error('El precio mínimo no puede ser mayor al precio máximo');
      }

      const products = await productRepository.findByPriceRange(minPrice, maxPrice);
      return products.map(product => product.toPlainObject());
    } catch (error) {
      console.error('Error al obtener productos por rango de precio:', error);
      throw error;
    }
  }

  async getMostUsedProducts(limit = 10) {
    try {
      if (isNaN(limit) || limit < 1) {
        limit = 10;
      }

      const products = await productRepository.findMostUsed(limit);
      return products.map(product => product.toPlainObject());
    } catch (error) {
      console.error('Error al obtener productos más utilizados:', error);
      throw new Error('Error al obtener productos más utilizados');
    }
  }
  async getProductsWithSimilarNames() {
    try {
      const products = await productRepository.findAll();
      const plainProducts = products.map(product => product.toPlainObject());
      
      const wordGroups = {};
      
      const sanitizeWord = (word) => {
        return word.toLowerCase()
          .replace(/[.,:;()\-]/g, '')
          .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove accents
      };

      const ignoredWords = ['de', 'la', 'el', 'los', 'las', 'un', 'una', 'y', 'o', 'en', 'para', 'con', 'por', 'a', 'al', 'del', 'sin', 'sus', 'tu', 'su'];

      plainProducts.forEach(product => {
        if (!product.name) return;
        const words = product.name.split(/\s+/);
        // Usar Set para no contar una palabra repetida dentro del mismo producto
        const uniqueWords = new Set(words.map(sanitizeWord).filter(w => w.length > 2 && !ignoredWords.includes(w)));
        
        uniqueWords.forEach(word => {
          if (!wordGroups[word]) {
            wordGroups[word] = [];
          }
          wordGroups[word].push({ id: product.id, name: product.name, serial_number: product.serial_number });
        });
      });

      const result = [];
      Object.keys(wordGroups).forEach(word => {
        if (wordGroups[word].length > 1) { // más de un producto comparte esta palabra
          const similarObj = new SimilarProductNames({
            word,
            count: wordGroups[word].length,
            products: wordGroups[word]
          });
          result.push(similarObj);
        }
      });
      
      // Ordenar mayor frecuencia primero
      result.sort((a, b) => b.count - a.count);

      return result.map(item => item.toPlainObject());
    } catch (error) {
      console.error('Error al obtener nombres similares:', error);
      throw new Error('Error al obtener nombres similares');
    }
  }
}

module.exports = new ProductService();
