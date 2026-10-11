import productionLogRepository from '../repositories/productionLogRepository';
import type { ProductionLogData, ProductionLogCheckboxData } from '../types/productionLog';

type DatePart = { type: string; value: string };

function getDatePart(parts: DatePart[], type: string): string {
  return parts.find(p => p.type === type)?.value ?? '';
}

class ProductionLogService {
  async getActiveProductionLogs() {
    try {
      const dateParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(new Date()) as DatePart[];
      const todayLocalStr = `${getDatePart(dateParts, 'year')}-${getDatePart(dateParts, 'month')}-${getDatePart(dateParts, 'day')}`;

      const logs = await productionLogRepository.getActive(todayLocalStr);
      const groups: Record<string, any[]> = {};

      for (const log of logs) {
        if (!log.created_at) continue;
        const dateObj = new Date(log.created_at as string);
        const logParts = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Mexico_City',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).formatToParts(dateObj) as DatePart[];
        const localDateStr = `${getDatePart(logParts, 'year')}-${getDatePart(logParts, 'month')}-${getDatePart(logParts, 'day')}`;
        if (!groups[localDateStr]) groups[localDateStr] = [];
        groups[localDateStr].push(log.toPlainObject());
      }

      return Object.keys(groups)
        .sort()
        .map((date) => ({ date, logs: groups[date] }));
    } catch (error) {
      console.error('Error al obtener la bitácora de producción activa:', error);
      throw new Error('Error al obtener la bitácora de producción activa');
    }
  }

  async getProductionLogsPaginated(page = 1, limit = 10, searchTerm = '', searchDate: string | null = null) {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 10;
      const result = await productionLogRepository.findAllPaginated(page, limit, searchTerm, searchDate);
      return {
        data: result.data.map((log) => log.toPlainObject()),
        pagination: result.pagination,
        searchTerm: result.searchTerm,
        searchDate: result.searchDate
      };
    } catch (error) {
      console.error('Error al obtener el historial paginado de bitácoras de producción:', error);
      throw new Error('Error al obtener el historial paginado de bitácoras de producción');
    }
  }

  async getProductionLogById(id: number) {
    try {
      const logId = parseInt(String(id), 10);
      if (isNaN(logId)) throw new Error('ID de bitácora inválido');
      const log = await productionLogRepository.getById(logId);
      if (!log) throw new Error('Registro de bitácora no encontrado');
      return log.toPlainObject();
    } catch (error) {
      console.error('Error al obtener registro de bitácora de producción:', error);
      throw error;
    }
  }

  async getProductionLogsByOrderId(orderId: number) {
    try {
      const oId = parseInt(String(orderId), 10);
      if (isNaN(oId)) throw new Error('ID de orden inválido');
      const logs = await productionLogRepository.getByOrderId(oId);
      return logs.map((log) => log.toPlainObject());
    } catch (error) {
      console.error('Error al obtener bitácoras de producción por orden:', error);
      throw error;
    }
  }

  async createProductionLog({
    order_id,
    created_by,
    delivery_at,
    cantidad,
    descripcion,
    responsable,
    completado,
    created_at
  }: ProductionLogData) {
    try {
      if (cantidad === undefined || cantidad === null || cantidad === '') {
        throw new Error('La cantidad es requerida');
      }
      const cleanCantidad = parseFloat(String(cantidad));
      if (isNaN(cleanCantidad) || cleanCantidad < 0) {
        throw new Error('La cantidad debe ser un número válido mayor o igual a cero');
      }

      if (!delivery_at) throw new Error('La fecha de entrega es requerida');
      if (!descripcion || !descripcion.trim()) throw new Error('La descripción es requerida');
      if (!responsable || !responsable.trim()) throw new Error('El responsable es requerido');

      const cleanResponsable = responsable.trim().toLowerCase();
      if (cleanResponsable !== 'most' && cleanResponsable !== 'maq') {
        throw new Error('El responsable debe ser únicamente "most" o "maq"');
      }

      const log = await productionLogRepository.create({
        order_id: order_id ? parseInt(String(order_id), 10) : null,
        created_by: created_by ? parseInt(String(created_by), 10) : null,
        delivery_at,
        cantidad: cleanCantidad,
        descripcion: descripcion.trim(),
        responsable: cleanResponsable,
        completado: completado === true || completado === 'true' || completado === 1,
        created_at: created_at || null
      });
      if (!log) throw new Error('Error al crear registro de bitácora de producción');
      return log.toPlainObject();
    } catch (error) {
      console.error('Error al crear registro de bitácora de producción:', error);
      throw error;
    }
  }

  async updateProductionLog(id: number, data: ProductionLogData) {
    try {
      const logId = parseInt(String(id), 10);
      if (isNaN(logId)) throw new Error('ID de bitácora inválido');
      const existing = await productionLogRepository.getById(logId);
      if (!existing) throw new Error('Registro de bitácora de producción no encontrado');

      if (data.delivery_at !== undefined && !data.delivery_at) {
        throw new Error('La fecha de entrega no puede estar vacía');
      }

      if (data.cantidad !== undefined && (data.cantidad === null || data.cantidad === '')) {
        throw new Error('La cantidad no puede estar vacía');
      }
      if (data.cantidad !== undefined) {
        const cleanCantidad = parseFloat(String(data.cantidad));
        if (isNaN(cleanCantidad) || cleanCantidad < 0) {
          throw new Error('La cantidad debe ser un número válido mayor o igual a cero');
        }
        data.cantidad = cleanCantidad;
      }

      if (data.descripcion !== undefined && !(data.descripcion as string).trim()) {
        throw new Error('La descripción no puede estar vacía');
      }

      if (data.responsable !== undefined) {
        if (!(data.responsable as string).trim()) throw new Error('El responsable no puede estar vacío');
        const cleanResponsable = (data.responsable as string).trim().toLowerCase();
        if (cleanResponsable !== 'most' && cleanResponsable !== 'maq') {
          throw new Error('El responsable debe ser únicamente "most" o "maq"');
        }
        data.responsable = cleanResponsable;
      }

      const repoPayload: {
        order_id?: number | null;
        created_by?: number | null;
        delivery_at?: string;
        cantidad?: number;
        descripcion?: string;
        responsable?: string;
        completado?: boolean;
        created_at?: string | null;
      } = {
        order_id:
          data.order_id !== undefined
            ? data.order_id !== null && data.order_id !== ''
              ? parseInt(String(data.order_id), 10)
              : null
            : undefined,
        created_by:
          data.created_by !== undefined
            ? data.created_by !== null && data.created_by !== ''
              ? parseInt(String(data.created_by), 10)
              : null
            : undefined,
        delivery_at: data.delivery_at !== undefined ? data.delivery_at : undefined,
        cantidad: data.cantidad !== undefined ? parseFloat(String(data.cantidad)) : undefined,
        descripcion: data.descripcion as string | undefined,
        responsable: data.responsable as string | undefined,
        completado:
          data.completado !== undefined
            ? data.completado === true || data.completado === 'true' || data.completado === 1
            : undefined,
        created_at: data.created_at as string | null | undefined
      };
      // Remove undefined keys
      (Object.keys(repoPayload) as (keyof typeof repoPayload)[]).forEach(
        (k) => repoPayload[k] === undefined && delete repoPayload[k]
      );
      const log = await productionLogRepository.update(logId, repoPayload);
      if (!log) throw new Error('Error al actualizar registro de bitácora de producción');
      return log.toPlainObject();
    } catch (error) {
      console.error('Error al actualizar registro de bitácora de producción:', error);
      throw error;
    }
  }

  async updateProductionLogCheckboxes(id: number, data: ProductionLogCheckboxData) {
    try {
      const { completado } = data;
      const logId = parseInt(String(id), 10);
      if (isNaN(logId)) throw new Error('ID de bitácora inválido');
      const existing = await productionLogRepository.getById(logId);
      if (!existing) throw new Error('Registro de bitácora no encontrado');
      if (completado === undefined) {
        throw new Error('Debe proporcionar el estado del checkbox a actualizar');
      }
      const log = await productionLogRepository.updateCheckboxes(logId, completado);
      if (!log) throw new Error('Error al actualizar checkboxes de bitácora de producción');
      return log.toPlainObject();
    } catch (error) {
      console.error('Error al actualizar checkboxes de bitácora de producción:', error);
      throw error;
    }
  }

  async getProductionLogsHistoryDays(
    todayLocalStr: string,
    page = 1,
    limit = 10,
    searchTerm = '',
    searchDate: string | null = null
  ) {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 10;
      return await productionLogRepository.getHistoryDaysPaginated(
        todayLocalStr,
        page,
        limit,
        searchTerm,
        searchDate
      );
    } catch (error) {
      console.error('Error al obtener los días del historial de producción:', error);
      throw new Error('Error al obtener los días del historial de producción');
    }
  }

  async getProductionLogsByDay(dateLocalStr: string) {
    try {
      if (!dateLocalStr) throw new Error('Fecha inválida');
      const logs = await productionLogRepository.getByDay(dateLocalStr);
      return logs.map((log) => log.toPlainObject());
    } catch (error) {
      console.error('Error al obtener bitácoras de producción por día:', error);
      throw error;
    }
  }

  async deleteProductionLog(id: number): Promise<boolean> {
    try {
      const logId = parseInt(String(id), 10);
      if (isNaN(logId)) throw new Error('ID de bitácora inválido');
      const existing = await productionLogRepository.getById(logId);
      if (!existing) throw new Error('Registro de bitácora de producción no encontrado');
      const deleted = await productionLogRepository.delete(logId);
      if (!deleted) throw new Error('Error al eliminar el registro de bitácora de producción');
      return true;
    } catch (error) {
      console.error('Error al eliminar registro de bitácora de producción:', error);
      throw error;
    }
  }
}

export default new ProductionLogService();
