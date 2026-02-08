import type { Product, CreateProductForm, EditProductForm } from "./types";
import type { ProductTemplate } from "@/features/productTemplates/types";

export const ProductsApiService = {
  findAll: async (): Promise<Product[]> => {
    return window.api.getAllProducts();
  },

  findById: async (id: number): Promise<Product> => {
    return window.api.getProductById(id);
  },

  findWithTemplates: async (id: number): Promise<Product & { templates: ProductTemplate[] }> => {
    return window.api.getProductWithTemplates(id);
  },

  findAllWithTemplates: async (): Promise<(Product & { templates: ProductTemplate[] })[]> => {
    return window.api.getAllProductsWithTemplates();
  },

  create: async (product: CreateProductForm): Promise<Product> => {
    return window.api.createProduct(product);
  },

  update: async (id: number, product: EditProductForm): Promise<Product> => {
    return window.api.updateProduct(id, product);
  },

  delete: async (id: number): Promise<void> => {
    return window.api.deleteProduct(id);
  },

  search: async (searchTerm: string): Promise<Product[]> => {
    return window.api.searchProducts(searchTerm);
  },
};
