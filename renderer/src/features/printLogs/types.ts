import { z } from 'zod';

export const createPrintLogSchema = z.object({
  order_id: z.number().int().positive('ID de orden debe ser un número entero positivo').nullable().optional(),
  descripcion: z.string().min(1, 'La descripción es requerida'),
  hora_entrega: z.string().min(1, 'La hora de entrega es requerida'),
  responsable: z.enum(['most', 'maq'] as const),
  observaciones: z.string().nullable().optional(),
  envio: z.string().min(1, 'El envío es requerido'),
  pago: z.number().min(0, 'El pago debe ser mayor o igual a 0').nullable().optional(),
  status: z.enum(['Pendiente', 'En Proceso', 'Realizado'] as const)
});

export const editPrintLogSchema = createPrintLogSchema.partial();

export type CreatePrintLogForm = z.infer<typeof createPrintLogSchema>;
export type EditPrintLogForm = z.infer<typeof editPrintLogSchema>;

export interface PrintLog {
  id: number;
  order_id: number | null;
  descripcion: string;
  hora_entrega: string;
  responsable: 'most' | 'maq';
  observaciones: string | null;
  envio: string;
  pago: number | null;
  completado: boolean;
  status: 'Pendiente' | 'En Proceso' | 'Realizado';
  created_at: string;
  active: boolean;
  client_name?: string | null;
}

export interface GroupedPrintLogs {
  date: string;
  logs: PrintLog[];
}

export interface PaginatedPrintLogs {
  data: PrintLog[];
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

export interface PrintLogsTableRef {
  refresh: () => void;
  handleLogUpdated: (updatedLog: PrintLog) => void;
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


