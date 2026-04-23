const expensesRepository = require('../repositories/expensesRepository');

class ExpensesService {

  async getAll(page = 1, limit = 20) {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 20;

      const result = await expensesRepository.getAll(page, limit);

      return {
        data: result.data.map(e => e.toPlainObject()),
        pagination: result.pagination,
      };
    } catch (error) {
      console.error('Error al obtener gastos:', error);
      throw new Error('Error al obtener gastos');
    }
  }

  async getByCashSession(cashSessionId) {
    try {
      if (!cashSessionId || isNaN(cashSessionId)) {
        throw new Error('ID de sesión de caja inválido');
      }

      const expenses = await expensesRepository.getByCashSession(parseInt(cashSessionId));
      return expenses.map(e => e.toPlainObject());
    } catch (error) {
      console.error('Error al obtener gastos de la sesión:', error);
      throw error;
    }
  }

  async getById(id) {
    try {
      if (!id || isNaN(id)) throw new Error('ID de gasto inválido');

      const expense = await expensesRepository.getById(parseInt(id));
      if (!expense) throw new Error('Gasto no encontrado');

      return expense.toPlainObject();
    } catch (error) {
      console.error('Error al obtener gasto:', error);
      throw error;
    }
  }

  async create(data) {
    try {
      const { cash_session_id, user_id, amount, description, date } = data;

      if (!cash_session_id || isNaN(cash_session_id)) throw new Error('ID de sesión de caja inválido');
      if (!user_id         || isNaN(user_id))         throw new Error('ID de usuario inválido');

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('El monto del gasto debe ser mayor a 0');
      }

      if (!description || !description.trim()) {
        throw new Error('La descripción del gasto es requerida');
      }

      if (!date) throw new Error('La fecha del gasto es requerida');
      if (isNaN(new Date(date).getTime())) throw new Error('Fecha del gasto inválida');

      const expense = await expensesRepository.create({
        cash_session_id: parseInt(cash_session_id),
        user_id:         parseInt(user_id),
        amount:          parsedAmount,
        description:     description.trim(),
        date,
      });

      return expense.toPlainObject();
    } catch (error) {
      console.error('Error al crear gasto:', error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      if (!id || isNaN(id)) throw new Error('ID de gasto inválido');

      const payload = {};

      if (data.amount !== undefined) {
        const val = parseFloat(data.amount);
        if (isNaN(val) || val <= 0) throw new Error('El monto debe ser mayor a 0');
        payload.amount = val;
      }

      if (data.description !== undefined) {
        if (!data.description || !data.description.trim()) throw new Error('La descripción no puede estar vacía');
        payload.description = data.description.trim();
      }

      if (data.date !== undefined) {
        if (isNaN(new Date(data.date).getTime())) throw new Error('Fecha inválida');
        payload.date = data.date;
      }

      if (data.edited_by !== undefined) {
        if (isNaN(data.edited_by)) throw new Error('ID de usuario editor inválido');
        payload.edited_by = parseInt(data.edited_by);
      }

      if (Object.keys(payload).length === 0) {
        throw new Error('No se proporcionaron campos válidos para actualizar');
      }

      const expense = await expensesRepository.update(parseInt(id), payload);
      if (!expense) throw new Error('Gasto no encontrado o ya inactivo');

      return expense.toPlainObject();
    } catch (error) {
      console.error('Error al actualizar gasto:', error);
      throw error;
    }
  }

  async delete(id) {
    try {
      if (!id || isNaN(id)) throw new Error('ID de gasto inválido');

      const deleted = await expensesRepository.delete(parseInt(id));
      if (!deleted) throw new Error('Gasto no encontrado o ya eliminado');
    } catch (error) {
      console.error('Error al eliminar gasto:', error);
      throw error;
    }
  }
}

module.exports = new ExpensesService();
