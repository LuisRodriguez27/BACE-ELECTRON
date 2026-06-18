import printLogRepository from '../repositories/printLogRepository';
import type { PrintLogData, PrintLogCheckboxData } from '../types/printLog';

type DatePart = { type: string; value: string };

function getDatePart(parts: DatePart[], type: string): string {
  return parts.find(p => p.type === type)?.value ?? '';
}

class PrintLogService {
  async getActivePrintLogs() {
    try {
      const dateParts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()) as DatePart[];
      const todayLocalStr = `${getDatePart(dateParts, 'year')}-${getDatePart(dateParts, 'month')}-${getDatePart(dateParts, 'day')}`;

      const logs = await printLogRepository.getActive(todayLocalStr);
      const groups: Record<string, any[]> = {};

      for (const log of logs) {
        if (!log.created_at) continue;
        const dateObj = new Date(log.created_at as string);
        const logParts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(dateObj) as DatePart[];
        const localDateStr = `${getDatePart(logParts, 'year')}-${getDatePart(logParts, 'month')}-${getDatePart(logParts, 'day')}`;
        if (!groups[localDateStr]) groups[localDateStr] = [];
        groups[localDateStr].push(log.toPlainObject());
      }

      return Object.keys(groups).sort().map(date => ({ date, logs: groups[date] }));
    } catch (error) {
      console.error('Error al obtener la bitácora activa:', error);
      throw new Error('Error al obtener la bitácora activa');
    }
  }

  async getPrintLogsPaginated(page = 1, limit = 10, searchTerm = '', searchDate: string | null = null) {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 10;
      const result = await printLogRepository.findAllPaginated(page, limit, searchTerm, searchDate);
      return { data: result.data.map((log) => log.toPlainObject()), pagination: result.pagination, searchTerm: result.searchTerm, searchDate: result.searchDate };
    } catch (error) {
      console.error('Error al obtener el historial paginado de bitácoras:', error);
      throw new Error('Error al obtener el historial paginado de bitácoras');
    }
  }

  async getPrintLogById(id: number) {
    try {
      const logId = parseInt(String(id), 10);
      if (isNaN(logId)) throw new Error('ID de bitácora inválido');
      const log = await printLogRepository.getById(logId);
      if (!log) throw new Error('Registro de bitácora no encontrado');
      return log.toPlainObject();
    } catch (error) {
      console.error('Error al obtener registro de bitácora:', error);
      throw error;
    }
  }

  async getPrintLogsByOrderId(orderId: number) {
    try {
      const oId = parseInt(String(orderId), 10);
      if (isNaN(oId)) throw new Error('ID de orden inválido');
      const logs = await printLogRepository.getByOrderId(oId);
      return logs.map((log) => log.toPlainObject());
    } catch (error) {
      console.error('Error al obtener bitácoras por orden:', error);
      throw error;
    }
  }

  async createPrintLog({ order_id, descripcion, hora_entrega, responsable, observaciones, envio, pago, completado, status, created_at }: PrintLogData) {
    try {
      if (!descripcion || !descripcion.trim()) throw new Error('La descripción es requerida');
      if (!hora_entrega) throw new Error('La hora de entrega es requerida');
      if (!responsable || !responsable.trim()) throw new Error('El responsable es requerido');

      const cleanResponsable = responsable.trim().toLowerCase();
      if (cleanResponsable !== 'most' && cleanResponsable !== 'maq') throw new Error('El responsable debe ser únicamente "most" o "maq"');
      if (!envio || !envio.trim()) throw new Error('El envío es requerido');
      if (pago !== undefined && pago !== null && pago !== '') {
        if (isNaN(parseFloat(String(pago)))) throw new Error('El pago debe ser un valor numérico');
      }

      const log = await printLogRepository.create({
        order_id: order_id ? parseInt(String(order_id), 10) : null,
        descripcion: descripcion.trim(), hora_entrega,
        responsable: cleanResponsable,
        observaciones: observaciones ? observaciones.trim() : null,
        envio: envio.trim(),
        pago: pago !== undefined && pago !== null && pago !== '' ? parseFloat(String(pago)) : null,
        completado: completado === true || completado === 'true' || completado === 1,
        status: status || 'Pendiente',
        created_at: created_at || null
      });
      if (!log) throw new Error('Error al crear registro de bitácora');
      return log.toPlainObject();
    } catch (error) {
      console.error('Error al crear registro de bitácora:', error);
      throw error;
    }
  }

  async updatePrintLog(id: number, printLogData: PrintLogData) {
    try {
      const logId = parseInt(String(id), 10);
      if (isNaN(logId)) throw new Error('ID de bitácora inválido');
      const existing = await printLogRepository.getById(logId);
      if (!existing) throw new Error('Registro de bitácora no encontrado');

      if (printLogData.descripcion !== undefined && !(printLogData.descripcion as string).trim()) throw new Error('La descripción no puede estar vacía');
      if (printLogData.hora_entrega !== undefined && !printLogData.hora_entrega) throw new Error('La hora de entrega no puede estar vacía');

      if (printLogData.responsable !== undefined) {
        if (!(printLogData.responsable as string).trim()) throw new Error('El responsable no puede estar vacío');
        const cleanResponsable = (printLogData.responsable as string).trim().toLowerCase();
        if (cleanResponsable !== 'most' && cleanResponsable !== 'maq') throw new Error('El responsable debe ser únicamente "most" o "maq"');
        printLogData.responsable = cleanResponsable;
      }
      if (printLogData.envio !== undefined && !(printLogData.envio as string).trim()) throw new Error('El envío no puede estar vacío');
      if (printLogData.pago !== undefined && printLogData.pago !== null && printLogData.pago !== '') {
        if (isNaN(parseFloat(String(printLogData.pago)))) throw new Error('El pago debe ser un valor numérico');
      }
      if (printLogData.status !== undefined) {
        const validStatuses = ['Pendiente', 'En Proceso', 'Realizado'];
        if (!validStatuses.includes(printLogData.status as string)) throw new Error('Estado de bitácora inválido');
      }

      const repoPayload: { order_id?: number | null; descripcion?: string; hora_entrega?: string; responsable?: string; observaciones?: string | null; envio?: string; pago?: number | null; completado?: boolean; status?: string; created_at?: string | null } = {
        order_id: printLogData.order_id !== undefined ? (printLogData.order_id !== null && printLogData.order_id !== '' ? parseInt(String(printLogData.order_id), 10) : null) : undefined,
        descripcion: printLogData.descripcion as string | undefined,
        hora_entrega: printLogData.hora_entrega as string | undefined,
        responsable: printLogData.responsable as string | undefined,
        observaciones: printLogData.observaciones as string | null | undefined,
        envio: printLogData.envio as string | undefined,
        pago: printLogData.pago !== undefined ? (printLogData.pago !== null && printLogData.pago !== '' ? parseFloat(String(printLogData.pago)) : null) : undefined,
        completado: printLogData.completado !== undefined ? (printLogData.completado === true || printLogData.completado === 'true' || printLogData.completado === 1) : undefined,
        status: printLogData.status as string | undefined,
        created_at: printLogData.created_at as string | null | undefined
      };
      // Remove undefined keys
      (Object.keys(repoPayload) as (keyof typeof repoPayload)[]).forEach(k => repoPayload[k] === undefined && delete repoPayload[k]);
      const log = await printLogRepository.update(logId, repoPayload);
      if (!log) throw new Error('Error al actualizar registro de bitácora');
      return log.toPlainObject();
    } catch (error) {
      console.error('Error al actualizar registro de bitácora:', error);
      throw error;
    }
  }

  async updatePrintLogCheckboxes(id: number, data: PrintLogCheckboxData) {
    try {
      const { completado } = data;
      const logId = parseInt(String(id), 10);
      if (isNaN(logId)) throw new Error('ID de bitácora inválido');
      const existing = await printLogRepository.getById(logId);
      if (!existing) throw new Error('Registro de bitácora no encontrado');
      if (completado === undefined) throw new Error('Debe proporcionar el estado del checkbox a actualizar');
      const log = await printLogRepository.updateCheckboxes(logId, completado);
      if (!log) throw new Error('Error al actualizar checkboxes de bitácora');
      return log.toPlainObject();
    } catch (error) {
      console.error('Error al actualizar checkboxes de bitácora:', error);
      throw error;
    }
  }

  async getPrintLogsHistoryDays(todayLocalStr: string, page = 1, limit = 10, searchTerm = '', searchDate: string | null = null) {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 10;
      return await printLogRepository.getHistoryDaysPaginated(todayLocalStr, page, limit, searchTerm, searchDate);
    } catch (error) {
      console.error('Error al obtener los días del historial:', error);
      throw new Error('Error al obtener los días del historial');
    }
  }

  async getPrintLogsByDay(dateLocalStr: string) {
    try {
      if (!dateLocalStr) throw new Error('Fecha inválida');
      const logs = await printLogRepository.getByDay(dateLocalStr);
      return logs.map((log) => log.toPlainObject());
    } catch (error) {
      console.error('Error al obtener bitácoras por día:', error);
      throw error;
    }
  }

  async deletePrintLog(id: number): Promise<boolean> {
    try {
      const logId = parseInt(String(id), 10);
      if (isNaN(logId)) throw new Error('ID de bitácora inválido');
      const existing = await printLogRepository.getById(logId);
      if (!existing) throw new Error('Registro de bitácora no encontrado');
      const deleted = await printLogRepository.delete(logId);
      if (!deleted) throw new Error('Error al eliminar el registro de bitácora');
      return true;
    } catch (error) {
      console.error('Error al eliminar registro de bitácora:', error);
      throw error;
    }
  }
}

export default new PrintLogService();
