import productTemplateRepository from '../repositories/productTemplateRepository';
import productRepository from '../repositories/productRepository';
import type { TemplateData } from '../types/productTemplate';

class ProductTemplateService {
  async getAllTemplates() {
    try {
      const templates = await productTemplateRepository.findAll();
      return templates.map((t) => t.toPlainObject());
    } catch (error) {
      console.error('Error al obtener plantillas:', error);
      throw new Error('Error al obtener plantillas');
    }
  }

  async getTemplateById(id: number) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de plantilla inválido');
      const template = await productTemplateRepository.findById(id);
      if (!template) throw new Error('Plantilla no encontrada');
      return template.toPlainObject();
    } catch (error) {
      console.error('Error al obtener plantilla:', error);
      throw error;
    }
  }

  async getTemplatesByProductId(productId: number) {
    try {
      if (!productId || isNaN(Number(productId))) throw new Error('ID de producto inválido');
      const templates = await productTemplateRepository.findByProductId(productId);
      return templates.map((t) => t.toPlainObject());
    } catch (error) {
      console.error('Error al obtener plantillas del producto:', error);
      throw error;
    }
  }

  async createTemplate({ product_id, final_price, promo_price, discount_price, width, height, colors, position, texts, description, created_by }: TemplateData) {
    try {
      if (!product_id || isNaN(Number(product_id))) throw new Error('ID de producto inválido');
      if (final_price === undefined || final_price === null || isNaN(Number(final_price))) throw new Error('El precio final es requerido y debe ser un número válido');

      const numericFinalPrice = parseFloat(String(final_price));
      if (numericFinalPrice < 0) throw new Error('El precio final debe ser mayor o igual a cero');

      const product = await productRepository.findById(parseInt(String(product_id)));
      if (!product) throw new Error('El producto especificado no existe');

      if (width !== undefined && width !== null && (isNaN(Number(width)) || Number(width) < 0)) throw new Error('El ancho debe ser un número válido mayor o igual a cero');
      if (height !== undefined && height !== null && (isNaN(Number(height)) || Number(height) < 0)) throw new Error('El alto debe ser un número válido mayor o igual a cero');

      const processedColors = colors && typeof colors === 'string' && colors.trim() ? colors.trim() : null;
      const processedTexts = texts && typeof texts === 'string' && texts.trim() ? texts.trim() : null;

      const template = await productTemplateRepository.create({
        product_id: parseInt(String(product_id)), final_price: numericFinalPrice,
        promo_price: promo_price !== undefined ? (promo_price !== null ? parseFloat(String(promo_price)) : null) : null,
        discount_price: discount_price !== undefined ? (discount_price !== null ? parseFloat(String(discount_price)) : null) : null,
        width: width ? parseFloat(String(width)) : null, height: height ? parseFloat(String(height)) : null,
        colors: processedColors, position: position?.trim() || null, texts: processedTexts,
        description: description?.trim() || null, created_by: created_by ? parseInt(String(created_by)) : null
      });
      if (!template) throw new Error('Error al crear plantilla');
      return template.toPlainObject();
    } catch (error) {
      console.error('Error al crear plantilla:', error);
      throw error;
    }
  }

  async updateTemplate(id: number, { product_id, final_price, promo_price, discount_price, width, height, colors, position, texts, description }: Omit<TemplateData, 'created_by'>) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de plantilla inválido');
      if (!product_id || isNaN(Number(product_id))) throw new Error('ID de producto inválido');
      if (final_price === undefined || final_price === null || isNaN(Number(final_price))) throw new Error('El precio final es requerido y debe ser un número válido');

      const templateId = id;
      const existingTemplate = await productTemplateRepository.findById(templateId);
      if (!existingTemplate) throw new Error('Plantilla no encontrada');

      const product = await productRepository.findById(parseInt(String(product_id)));
      if (!product) throw new Error('El producto especificado no existe');

      const numericFinalPrice = parseFloat(String(final_price));
      if (numericFinalPrice < 0) throw new Error('El precio final debe ser mayor o igual a cero');
      if (width !== undefined && width !== null && (isNaN(Number(width)) || Number(width) < 0)) throw new Error('El ancho debe ser un número válido mayor o igual a cero');
      if (height !== undefined && height !== null && (isNaN(Number(height)) || Number(height) < 0)) throw new Error('El alto debe ser un número válido mayor o igual a cero');

      const processedColors = colors && typeof colors === 'string' && colors.trim() ? colors.trim() : null;
      const processedTexts = texts && typeof texts === 'string' && texts.trim() ? texts.trim() : null;

      const updated = await productTemplateRepository.update(templateId, {
        product_id: parseInt(String(product_id)), final_price: numericFinalPrice,
        promo_price: promo_price !== undefined ? (promo_price !== null ? parseFloat(String(promo_price)) : null) : null,
        discount_price: discount_price !== undefined ? (discount_price !== null ? parseFloat(String(discount_price)) : null) : null,
        width: width ? parseFloat(String(width)) : null, height: height ? parseFloat(String(height)) : null,
        colors: processedColors, position: position?.trim() || null, texts: processedTexts, description: description?.trim() || null
      });
      if (!updated) throw new Error('Error al actualizar plantilla');

      const updatedTemplate = await productTemplateRepository.findById(templateId);
      if (!updatedTemplate) throw new Error('Error: no se pudo recuperar la plantilla actualizada');

      const result = updatedTemplate.toPlainObject();
      if (!result.id || !result.product_id) { console.error('Plantilla actualizada inválida:', result); throw new Error('Datos de la plantilla actualizada inválidos'); }
      return result;
    } catch (error) {
      console.error('Error al actualizar plantilla:', error);
      throw error;
    }
  }

  async deleteTemplate(id: number) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de plantilla inválido');
      const templateId = id;
      const existingTemplate = await productTemplateRepository.findById(templateId);
      if (!existingTemplate) throw new Error('Plantilla no encontrada');
      const deleted = await productTemplateRepository.delete(templateId);
      if (!deleted) throw new Error('Error al eliminar plantilla');
    } catch (error) {
      console.error('Error al eliminar plantilla:', error);
      throw error;
    }
  }

  async searchTemplates(searchTerm: string) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) return this.getAllTemplates();
      const templates = await productTemplateRepository.searchByTerm(searchTerm.trim());
      return templates.map((t) => t.toPlainObject());
    } catch (error) {
      console.error('Error al buscar plantillas:', error);
      throw new Error('Error al buscar plantillas');
    }
  }

  async getTemplatesPaginated(page = 1, limit = 10, searchTerm = '') {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 10;
      const result = await productTemplateRepository.findPaginated(page, limit, searchTerm);
      return { data: result.data.map((t) => t.toPlainObject()), pagination: result.pagination, searchTerm: result.searchTerm };
    } catch (error) {
      console.error('Error al obtener plantillas paginadas:', error);
      throw new Error('Error al obtener plantillas paginadas');
    }
  }
}

export default new ProductTemplateService();
