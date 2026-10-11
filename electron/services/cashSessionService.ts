import cashSessionRepository from '../repositories/cashSessionRepository';
import authService from './authService';
import type { OpenSessionData, CloseSessionData } from '../types/cashSession';

class CashSessionService {
  async getAll(page = 1, limit = 20) {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 20;
      const result = await cashSessionRepository.getAll(page, limit);
      return { data: result.data.map((s) => s.toPlainObject()), pagination: result.pagination };
    } catch (error) {
      console.error('Error al obtener sesiones de caja:', error);
      throw new Error('Error al obtener sesiones de caja');
    }
  }

  async getClosed(page = 1, limit = 20) {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 20;
      const result = await cashSessionRepository.getClosed(page, limit);
      return { data: result.data.map((s) => s.toPlainObject()), pagination: result.pagination };
    } catch (error) {
      console.error('Error al obtener sesiones cerradas:', error);
      throw new Error('Error al obtener sesiones cerradas');
    }
  }

  async getActive() {
    try {
      const session = await cashSessionRepository.getActive();
      return session ? session.toPlainObject() : null;
    } catch (error) {
      console.error('Error al obtener sesión activa:', error);
      throw new Error('Error al obtener sesión activa');
    }
  }

  async getById(id: number) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de sesión inválido');
      const session = await cashSessionRepository.getById(id);
      if (!session) throw new Error('Sesión de caja no encontrada');
      return session.toPlainObject();
    } catch (error) {
      console.error('Error al obtener sesión de caja:', error);
      throw error;
    }
  }

  async getByDateRange(from: string, to: string) {
    try {
      if (!from || !to) throw new Error('Se requieren las fechas de inicio y fin');
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (isNaN(fromDate.getTime())) throw new Error('Fecha de inicio inválida');
      if (isNaN(toDate.getTime())) throw new Error('Fecha de fin inválida');
      if (fromDate > toDate) throw new Error('La fecha de inicio no puede ser posterior a la fecha de fin');
      const sessions = await cashSessionRepository.getByDateRange(fromDate.toISOString(), toDate.toISOString());
      return sessions.map((s) => s.toPlainObject());
    } catch (error) {
      console.error('Error al obtener sesiones por rango de fechas:', error);
      throw error;
    }
  }

  async getSummary(id: number) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de sesión inválido');
      const summary = await cashSessionRepository.getSummary(id);
      if (!summary) throw new Error('Sesión de caja no encontrada');
      return summary;
    } catch (error) {
      console.error('Error al obtener resumen de sesión:', error);
      throw error;
    }
  }

  async open(data: OpenSessionData) {
    try {
      const opening_balance = parseFloat(String(data?.opening_balance));
      if (isNaN(opening_balance) || opening_balance < 0) throw new Error('El balance de apertura debe ser un número mayor o igual a 0');
      const session = await cashSessionRepository.open({ opening_balance, notes: data?.notes?.trim() || null });
      return session.toPlainObject();
    } catch (error) {
      console.error('Error al abrir sesión de caja:', error);
      throw error;
    }
  }

  async close(id: number, data: CloseSessionData) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de sesión inválido');
      const closing_balance = parseFloat(String(data?.closing_balance));
      if (isNaN(closing_balance)) throw new Error('El balance de cierre debe ser un número válido');
      const session = await cashSessionRepository.close(id, { closing_balance, notes: data?.notes?.trim() || null });
      return session.toPlainObject();
    } catch (error) {
      console.error('Error al cerrar sesión de caja:', error);
      throw error;
    }
  }

  async update(id: number, data: OpenSessionData) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de sesión inválido');
      const payload: { opening_balance?: number; notes?: string | null } = {};
      if (data.opening_balance !== undefined) {
        const val = parseFloat(String(data.opening_balance));
        if (isNaN(val) || val < 0) throw new Error('El balance de apertura debe ser un número mayor o igual a 0');
        payload.opening_balance = val;
      }
      if (data.notes !== undefined) payload.notes = data.notes?.trim() || null;
      if (Object.keys(payload).length === 0) throw new Error('No se proporcionaron campos válidos para actualizar');
      const session = await cashSessionRepository.update(id, payload);
      return session.toPlainObject();
    } catch (error) {
      console.error('Error al actualizar sesión de caja:', error);
      throw error;
    }
  }

  async reopen(id: number) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de sesión inválido');
      const authorized = await authService.hasPermission('Reabrir Caja');
      if (!authorized) throw new Error('No tienes permiso para reabrir la caja');
      const session = await cashSessionRepository.reopen(id);
      return session.toPlainObject();
    } catch (error) {
      console.error('Error al reabrir sesión de caja:', error);
      throw error;
    }
  }
}

export default new CashSessionService();
