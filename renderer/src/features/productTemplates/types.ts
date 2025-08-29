export interface ProductTemplate {
  id: number;
  product_id: number;
  width?: number;
  height?: number;
  colors?: string;
  position?: string;
  description?: string;
  created_by?: number;
  created_at: string;
  
  // Campos añadidos por JOIN en las consultas
  product_name?: string;
  serial_number?: string;
  created_by_username?: string;
}

export interface CreateProductTemplateForm {
  product_id: number;
  width?: number;
  height?: number;
  colors?: string | string[];
  position?: string;
  description?: string;
  created_by?: number;
}

export interface EditProductTemplateForm {
  product_id?: number;
  width?: number;
  height?: number;
  colors?: string | string[];
  position?: string;
  description?: string;
}

// Tipo para las modificaciones de productos
export interface ProductModifications {
  width?: number;
  height?: number;
  colors?: string | string[];
  position?: string;
  description?: string;
}

// Tipo para estadísticas de uso de plantillas
export interface TemplateUsageStats {
  id: number;
  description: string;
  product_name: string;
  usage_count: number;
  last_used: string;
}

// Tipo para estadísticas de uso en órdenes
export interface TemplateOrderUsageStats {
  template_id: number;
  template_description: string;
  product_name: string;
  usage_count: number;
  total_quantity: number;
  avg_price: number;
}

// Tipo para respuesta de crear plantilla desde modificación
export interface CreateTemplateFromModificationResponse {
  success: boolean;
  template?: ProductTemplate;
  message?: string;
}

// Tipo para respuesta de clonar plantilla
export interface CloneTemplateResponse {
  success: boolean;
  template?: ProductTemplate;
  message?: string;
}
