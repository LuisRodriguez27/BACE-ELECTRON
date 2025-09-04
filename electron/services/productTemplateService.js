const productTemplateRepository = require('../repositories/productTemplateRepository');
const productRepository = require('../repositories/productRepository');

class ProductTemplateService {

  async getAllTemplates() {
    try {
      const templates = productTemplateRepository.findAll();
      return templates.map(template => template.toPlainObject());
    } catch (error) {
      console.error('Error al obtener plantillas:', error);
      throw new Error('Error al obtener plantillas');
    }
  }

  async getTemplateById(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de plantilla inválido');
      }

      const template = productTemplateRepository.findById(parseInt(id));
      
      if (!template) {
        throw new Error('Plantilla no encontrada');
      }

      return template.toPlainObject();
    } catch (error) {
      console.error('Error al obtener plantilla:', error);
      throw error;
    }
  }

  async getTemplatesByProductId(productId) {
    try {
      if (!productId || isNaN(productId)) {
        throw new Error('ID de producto inválido');
      }

      const templates = productTemplateRepository.findByProductId(parseInt(productId));
      return templates.map(template => template.toPlainObject());
    } catch (error) {
      console.error('Error al obtener plantillas del producto:', error);
      throw error;
    }
  }

  async getTemplatesByUserId(userId) {
    try {
      if (!userId || isNaN(userId)) {
        throw new Error('ID de usuario inválido');
      }

      const templates = productTemplateRepository.findByUserId(parseInt(userId));
      return templates.map(template => template.toPlainObject());
    } catch (error) {
      console.error('Error al obtener plantillas del usuario:', error);
      throw error;
    }
  }

  async createTemplate({ product_id, final_price, width, height, colors, position, texts, description, created_by }) {
    try {
      // Validaciones de negocio
      if (!product_id || isNaN(product_id)) {
        throw new Error('ID de producto inválido');
      }

      if (final_price === undefined || final_price === null || isNaN(final_price)) {
        throw new Error('El precio final es requerido y debe ser un número válido');
      }

      const numericFinalPrice = parseFloat(final_price);
      if (numericFinalPrice < 0) {
        throw new Error('El precio final debe ser mayor o igual a cero');
      }

      // Verificar que el producto existe
      const product = productRepository.findById(parseInt(product_id));
      if (!product) {
        throw new Error('El producto especificado no existe');
      }

      // Validar dimensiones si se proporcionan
      if (width !== undefined && width !== null && (isNaN(width) || width < 0)) {
        throw new Error('El ancho debe ser un número válido mayor o igual a cero');
      }

      if (height !== undefined && height !== null && (isNaN(height) || height < 0)) {
        throw new Error('El alto debe ser un número válido mayor o igual a cero');
      }

      // Procesar colores (como texto plano)
      let processedColors = null;
      if (colors && typeof colors === 'string' && colors.trim()) {
        processedColors = colors.trim();
      }

      // Procesar textos (como texto plano)
      let processedTexts = null;
      if (texts && typeof texts === 'string' && texts.trim()) {
        processedTexts = texts.trim();
      }

      // Crear plantilla
      const template = productTemplateRepository.create({
        product_id: parseInt(product_id),
        final_price: numericFinalPrice,
        width: width ? parseFloat(width) : null,
        height: height ? parseFloat(height) : null,
        colors: processedColors,
        position: position?.trim() || null,
        texts: processedTexts,
        description: description?.trim() || null,
        created_by: created_by ? parseInt(created_by) : null
      });

      return template.toPlainObject();

    } catch (error) {
      console.error('Error al crear plantilla:', error);
      throw error;
    }
  }

  async updateTemplate(id, { product_id, final_price, width, height, colors, position, texts, description }) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de plantilla inválido');
      }

      if (!product_id || isNaN(product_id)) {
        throw new Error('ID de producto inválido');
      }

      if (final_price === undefined || final_price === null || isNaN(final_price)) {
        throw new Error('El precio final es requerido y debe ser un número válido');
      }

      const templateId = parseInt(id);

      // Verificar si la plantilla existe
      const existingTemplate = productTemplateRepository.findById(templateId);
      if (!existingTemplate) {
        throw new Error('Plantilla no encontrada');
      }

      // Verificar que el producto existe
      const product = productRepository.findById(parseInt(product_id));
      if (!product) {
        throw new Error('El producto especificado no existe');
      }

      const numericFinalPrice = parseFloat(final_price);
      if (numericFinalPrice < 0) {
        throw new Error('El precio final debe ser mayor o igual a cero');
      }

      // Validar dimensiones si se proporcionan
      if (width !== undefined && width !== null && (isNaN(width) || width < 0)) {
        throw new Error('El ancho debe ser un número válido mayor o igual a cero');
      }

      if (height !== undefined && height !== null && (isNaN(height) || height < 0)) {
        throw new Error('El alto debe ser un número válido mayor o igual a cero');
      }

      // Procesar colores
      let processedColors = null;
      if (colors && typeof colors === 'string' && colors.trim()) {
        processedColors = colors.trim();
      }

      // Procesar textos
      let processedTexts = null;
      if (texts && typeof texts === 'string' && texts.trim()) {
        processedTexts = texts.trim();
      }

      // Actualizar plantilla
      const updated = productTemplateRepository.update(templateId, {
        product_id: parseInt(product_id),
        final_price: numericFinalPrice,
        width: width ? parseFloat(width) : null,
        height: height ? parseFloat(height) : null,
        colors: processedColors,
        position: position?.trim() || null,
        texts: processedTexts,
        description: description?.trim() || null
      });

      if (!updated) {
        throw new Error('Error al actualizar plantilla');
      }

      // Obtener plantilla actualizada
      const updatedTemplate = productTemplateRepository.findById(templateId);
      
      if (!updatedTemplate) {
        throw new Error('Error: no se pudo recuperar la plantilla actualizada');
      }
      
      const result = updatedTemplate.toPlainObject();
      
      // Validar que el resultado tenga las propiedades necesarias
      if (!result.id || !result.product_id) {
        console.error('Plantilla actualizada inválida:', result);
        throw new Error('Datos de la plantilla actualizada inválidos');
      }
      
      return result;
      
    } catch (error) {
      console.error('Error al actualizar plantilla:', error);
      throw error;
    }
  }

  async deleteTemplate(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de plantilla inválido');
      }

      const templateId = parseInt(id);

      // Verificar si la plantilla existe
      const existingTemplate = productTemplateRepository.findById(templateId);
      if (!existingTemplate) {
        throw new Error('Plantilla no encontrada');
      }

      // Lógica de negocio: verificar si la plantilla está en órdenes activas
      // TODO: Implementar verificación de órdenes cuando esté listo el service de orders
      // const hasActiveOrders = await orderService.hasActiveOrdersByTemplateId(templateId);
      // if (hasActiveOrders) {
      //   throw new Error('No se puede eliminar una plantilla que está en órdenes activas');
      // }

      const deleted = productTemplateRepository.delete(templateId);

      if (!deleted) {
        throw new Error('Error al eliminar plantilla');
      }

      // El frontend espera void, no retornamos nada
    } catch (error) {
      console.error('Error al eliminar plantilla:', error);
      throw error;
    }
  }

  async searchTemplates(searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return this.getAllTemplates();
      }

      const templates = productTemplateRepository.searchByTerm(searchTerm.trim());
      return templates.map(template => template.toPlainObject());
    } catch (error) {
      console.error('Error al buscar plantillas:', error);
      throw new Error('Error al buscar plantillas');
    }
  }
}

module.exports = new ProductTemplateService();
