import type {
  ProductTemplate,
  CreateProductTemplateForm,
  EditProductTemplateForm,
  ProductModifications,
  TemplateUsageStats,
  TemplateOrderUsageStats,
  CloneTemplateResponse
} from "./types";

export const ProductTemplatesApiService = {
  // CRUD básico
  findAll: async (): Promise<ProductTemplate[]> => {
    return window.api.getAllTemplates();
  },

  findById: async (id: number): Promise<ProductTemplate> => {
    return window.api.getTemplateById(id);
  },

  findByProductId: async (productId: number): Promise<ProductTemplate[]> => {
    return window.api.getTemplatesByProductId(productId);
  },

  findByUserId: async (userId: number): Promise<ProductTemplate[]> => {
    return window.api.getTemplatesByUserId(userId);
  },

  create: async (template: CreateProductTemplateForm): Promise<ProductTemplate> => {
    return window.api.createTemplate(template);
  },

  update: async (id: number, template: EditProductTemplateForm): Promise<{ success: boolean; message: string; data?: ProductTemplate }> => {
    return window.api.updateTemplate(id, template);
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    return window.api.deleteTemplate(id);
  },

  // Funciones especiales
  createFromModification: async (data: {
    product_id: number;
    modifications: ProductModifications;
    created_by: number;
    templateDescription: string;
  }): Promise<ProductTemplate> => {
    const result = await window.api.createTemplateFromModification(data);
    // Si el backend retorna un objeto con success, extraer el template
    if (typeof result === 'object' && 'success' in result && result.success) {
      return (result as any).template;
    }
    // Si retorna directamente el template
    return result as ProductTemplate;
  },

  findSimilar: async (
    productId: number, 
    width: number, 
    height: number, 
    tolerance: number = 0.1
  ): Promise<ProductTemplate[]> => {
    return window.api.findSimilarTemplates(productId, width, height, tolerance);
  },

  getUsageStats: async (): Promise<TemplateUsageStats[]> => {
    return window.api.getTemplateUsageStats();
  },

  getOrderUsageStats: async (): Promise<TemplateOrderUsageStats[]> => {
    return window.api.getTemplateUsageInOrders();
  },

  clone: async (
    templateId: number,
    createdBy: number,
    newDescription: string
  ): Promise<CloneTemplateResponse> => {
    return window.api.cloneTemplate(templateId, createdBy, newDescription);
  },

  // Funciones relacionadas con órdenes
  findOrdersUsingTemplate: async (templateId: number): Promise<any[]> => {
    return window.api.getOrdersUsingTemplate(templateId);
  }
};
