import type {
  ProductTemplate,
  CreateProductTemplateForm,
  EditProductTemplateForm
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

  create: async (template: CreateProductTemplateForm): Promise<ProductTemplate> => {
    return window.api.createTemplate(template);
  },

  update: async (id: number, template: EditProductTemplateForm): Promise<ProductTemplate> => {
    return window.api.updateTemplate(id, template);
  },

  delete: async (id: number): Promise<void> => {
    return window.api.deleteTemplate(id);
  },

  search: async (searchTerm: string): Promise<ProductTemplate[]> => {
    return window.api.searchTemplates(searchTerm);
  },
};
