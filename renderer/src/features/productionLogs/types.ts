import { z } from 'zod';

export const createProductionLogSchema = z.object({
  order_id: z.number().int().positive('ID de orden debe ser un número entero positivo').nullable().optional(),
  created_by: z.number().int().positive().nullable().optional(),
  delivery_at: z.string().min(1, 'La fecha de entrega es requerida'),
  cantidad: z.number().min(0.0001, 'La cantidad debe ser mayor a 0'),
  descripcion: z.string().min(1, 'La descripción es requerida'),
  responsable: z.enum(['most', 'maq'] as const),
  completado: z.boolean()
});

export const editProductionLogSchema = createProductionLogSchema.partial();

export type CreateProductionLogForm = z.infer<typeof createProductionLogSchema>;
export type EditProductionLogForm = z.infer<typeof editProductionLogSchema>;

export interface ProductionLog {
  id: number;
  order_id: number | null;
  created_by: number | null;
  delivery_at: string;
  cantidad: number;
  descripcion: string;
  responsable: 'most' | 'maq';
  completado: boolean;
  created_at: string;
  active: boolean;
  client_name?: string | null;
  creator_name?: string | null;
}

export interface GroupedProductionLogs {
  date: string;
  logs: ProductionLog[];
}

export interface PaginatedProductionLogs {
  data: ProductionLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  searchTerm?: string;
  searchDate?: string | null;
}

export interface ProductionLogsTableRef {
  refresh: () => void;
  handleLogUpdated: (updatedLog: ProductionLog) => void;
}

export interface HistoryDay {
  log_date: string;
  total_logs: number;
  all_completed: boolean;
}

export interface PaginatedHistoryDays {
  data: HistoryDay[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  searchTerm?: string;
  searchDate?: string | null;
}
