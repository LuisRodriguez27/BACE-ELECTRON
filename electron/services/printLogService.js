const printLogRepository = require('../repositories/printLogRepository');

class PrintLogService {
  async getActivePrintLogs() {
    try {
      // Obtener el inicio del día de hoy en la zona horaria local de México
      const dateParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(new Date());
      const year = dateParts.find(p => p.type === 'year').value;
      const month = dateParts.find(p => p.type === 'month').value;
      const day = dateParts.find(p => p.type === 'day').value;
      const todayLocalStr = `${year}-${month}-${day}`;

      const logs = await printLogRepository.getActive(todayLocalStr);

      // Agrupar los logs por la fecha local de México (YYYY-MM-DD)
      const groups = {};
      for (const log of logs) {
        if (!log.created_at) continue;

        const dateObj = new Date(log.created_at);
        const logDateParts = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Mexico_City',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).formatToParts(dateObj);
        const logYear = logDateParts.find(p => p.type === 'year').value;
        const logMonth = logDateParts.find(p => p.type === 'month').value;
        const logDay = logDateParts.find(p => p.type === 'day').value;
        const localDateStr = `${logYear}-${logMonth}-${logDay}`;

        if (!groups[localDateStr]) {
          groups[localDateStr] = [];
        }
        groups[localDateStr].push(log.toPlainObject());
      }

      // Convertir el objeto de agrupaciones en un arreglo ordenado cronológicamente: [ { date, logs } ]
      const sortedDates = Object.keys(groups).sort();
      return sortedDates.map(date => ({
        date,
        logs: groups[date]
      }));
    } catch (error) {
      console.error('Error al obtener la bitácora activa:', error);
      throw new Error('Error al obtener la bitácora activa');
    }
  }

  async getPrintLogsPaginated(page = 1, limit = 10, searchTerm = '', searchDate = null) {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 10;

      const result = await printLogRepository.findAllPaginated(page, limit, searchTerm, searchDate);
      return {
        data: result.data.map(log => log.toPlainObject()),
        pagination: result.pagination,
        searchTerm: result.searchTerm,
        searchDate: result.searchDate
      };
    } catch (error) {
      console.error('Error al obtener el historial paginado de bitácoras:', error);
      throw new Error('Error al obtener el historial paginado de bitácoras');
    }
  }

  async getPrintLogById(id) {
    try {
      const logId = parseInt(id, 10);
      if (isNaN(logId)) {
        throw new Error('ID de bitácora inválido');
      }

      const log = await printLogRepository.getById(logId);
      if (!log) {
        throw new Error('Registro de bitácora no encontrado');
      }

      return log.toPlainObject();
    } catch (error) {
      console.error('Error al obtener registro de bitácora:', error);
      throw error;
    }
  }

  async getPrintLogsByOrderId(orderId) {
    try {
      const oId = parseInt(orderId, 10);
      if (isNaN(oId)) {
        throw new Error('ID de orden inválido');
      }

      const logs = await printLogRepository.getByOrderId(oId);
      return logs.map(log => log.toPlainObject());
    } catch (error) {
      console.error('Error al obtener bitácoras por orden:', error);
      throw error;
    }
  }

  async createPrintLog({ order_id, descripcion, hora_entrega, responsable, observaciones, envio, pago, completado, status, created_at }) {
    try {
      if (!descripcion || !descripcion.trim()) {
        throw new Error('La descripción es requerida');
      }
      if (!hora_entrega) {
        throw new Error('La hora de entrega es requerida');
      }
      if (!responsable || !responsable.trim()) {
        throw new Error('El responsable es requerido');
      }

      const cleanResponsable = responsable.trim().toLowerCase();
      if (cleanResponsable !== 'most' && cleanResponsable !== 'maq') {
        throw new Error('El responsable debe ser únicamente "most" o "maq"');
      }

      if (!envio || !envio.trim()) {
        throw new Error('El envío es requerido');
      }

      if (pago !== undefined && pago !== null && pago !== '') {
        const parsedPago = parseFloat(pago);
        if (isNaN(parsedPago)) {
          throw new Error('El pago debe ser un valor numérico');
        }
      }

      const log = await printLogRepository.create({
        order_id: order_id ? parseInt(order_id, 10) : null,
        descripcion: descripcion.trim(),
        hora_entrega,
        responsable: cleanResponsable,
        observaciones: observaciones ? observaciones.trim() : null,
        envio: envio.trim(),
        pago: pago !== undefined && pago !== null && pago !== '' ? parseFloat(pago) : null,
        completado: completado === true || completado === 'true' || completado === 1,
        status: status || 'Pendiente',
        created_at: created_at || null
      });

      return log.toPlainObject();
    } catch (error) {
      console.error('Error al crear registro de bitácora:', error);
      throw error;
    }
  }

  async updatePrintLog(id, printLogData) {
    try {
      const logId = parseInt(id, 10);
      if (isNaN(logId)) {
        throw new Error('ID de bitácora inválido');
      }

      const existing = await printLogRepository.getById(logId);
      if (!existing) {
        throw new Error('Registro de bitácora no encontrado');
      }

      if (printLogData.descripcion !== undefined && !printLogData.descripcion.trim()) {
        throw new Error('La descripción no puede estar vacía');
      }
      if (printLogData.hora_entrega !== undefined && !printLogData.hora_entrega) {
        throw new Error('La hora de entrega no puede estar vacía');
      }
      if (printLogData.responsable !== undefined) {
        if (!printLogData.responsable.trim()) {
          throw new Error('El responsable no puede estar vacío');
        }
        const cleanResponsable = printLogData.responsable.trim().toLowerCase();
        if (cleanResponsable !== 'most' && cleanResponsable !== 'maq') {
          throw new Error('El responsable debe ser únicamente "most" o "maq"');
        }
        printLogData.responsable = cleanResponsable;
      }
      if (printLogData.envio !== undefined && !printLogData.envio.trim()) {
        throw new Error('El envío no puede estar vacío');
      }
      if (printLogData.pago !== undefined && printLogData.pago !== null && printLogData.pago !== '') {
        const parsedPago = parseFloat(printLogData.pago);
        if (isNaN(parsedPago)) {
          throw new Error('El pago debe ser un valor numérico');
        }
      }
      if (printLogData.status !== undefined) {
        const validStatuses = ['Pendiente', 'En Proceso', 'Realizado'];
        if (!validStatuses.includes(printLogData.status)) {
          throw new Error('Estado de bitácora inválido');
        }
      }

      const updatedData = { ...printLogData };
      if (updatedData.order_id !== undefined) {
        updatedData.order_id = updatedData.order_id ? parseInt(updatedData.order_id, 10) : null;
      }
      if (updatedData.pago !== undefined) {
        updatedData.pago = updatedData.pago !== null && updatedData.pago !== '' ? parseFloat(updatedData.pago) : null;
      }
      if (updatedData.completado !== undefined) {
        updatedData.completado = updatedData.completado === true || updatedData.completado === 'true' || updatedData.completado === 1;
      }

      const log = await printLogRepository.update(logId, updatedData);
      return log.toPlainObject();
    } catch (error) {
      console.error('Error al actualizar registro de bitácora:', error);
      throw error;
    }
  }

  async updatePrintLogCheckboxes(id, { completado }) {
    try {
      const logId = parseInt(id, 10);
      if (isNaN(logId)) {
        throw new Error('ID de bitácora inválido');
      }

      const existing = await printLogRepository.getById(logId);
      if (!existing) {
        throw new Error('Registro de bitácora no encontrado');
      }

      if (completado === undefined) {
        throw new Error('Debe proporcionar el estado del checkbox a actualizar');
      }

      const log = await printLogRepository.updateCheckboxes(logId, completado);
      return log.toPlainObject();
    } catch (error) {
      console.error('Error al actualizar checkboxes de bitácora:', error);
      throw error;
    }
  }

  async getPrintLogsHistoryDays(todayLocalStr, page = 1, limit = 10, searchTerm = '', searchDate = null) {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 10;
      
      const result = await printLogRepository.getHistoryDaysPaginated(todayLocalStr, page, limit, searchTerm, searchDate);
      return result;
    } catch (error) {
      console.error('Error al obtener los días del historial:', error);
      throw new Error('Error al obtener los días del historial');
    }
  }

  async getPrintLogsByDay(dateLocalStr) {
    try {
      if (!dateLocalStr) {
        throw new Error('Fecha inválida');
      }
      const logs = await printLogRepository.getByDay(dateLocalStr);
      return logs.map(log => log.toPlainObject());
    } catch (error) {
      console.error('Error al obtener bitácoras por día:', error);
      throw error;
    }
  }

  async deletePrintLog(id) {
    try {
      const logId = parseInt(id, 10);
      if (isNaN(logId)) {
        throw new Error('ID de bitácora inválido');
      }

      const existing = await printLogRepository.getById(logId);
      if (!existing) {
        throw new Error('Registro de bitácora no encontrado');
      }

      const deleted = await printLogRepository.delete(logId);
      if (!deleted) {
        throw new Error('Error al eliminar el registro de bitácora');
      }
      return true;
    } catch (error) {
      console.error('Error al eliminar registro de bitácora:', error);
      throw error;
    }
  }
}

module.exports = new PrintLogService();

