import budgetRepository from '../repositories/budgetRepository';
import clientRepository from '../repositories/clientRepository';
import userRepository from '../repositories/userRepository';
import productRepository from '../repositories/productRepository';
import productTemplateRepository from '../repositories/productTemplateRepository';
import orderRepository from '../repositories/orderRepository';
import type { BudgetItem, BudgetData } from '../types/budget';
import db from '../db';

class BudgetService {
  async getAllBudgets() {
    try {
      const budgets = await budgetRepository.findAll();
      return budgets.map((b) => b.toPlainObject());
    } catch (error) {
      console.error('Error al obtener presupuestos:', error);
      throw new Error('No se pudieron obtener los presupuestos.');
    }
  }

  async getBudgetsPaginated(page = 1, limit = 10, searchTerm = '') {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 10;
      const result = await budgetRepository.findAllPaginated(page, limit, searchTerm);
      return { data: result.data.map((b) => b.toPlainObject()), pagination: result.pagination, searchTerm: result.searchTerm };
    } catch (error) {
      console.error('Error al obtener presupuestos paginados:', error);
      throw new Error('Error al obtener presupuestos paginados');
    }
  }

  async getBudgetById(id: number) {
    try {
      if (!id || id <= 0) throw new Error('ID de presupuesto inválido.');
      const budget = await budgetRepository.findById(id);
      if (!budget) throw new Error('Presupuesto no encontrado.');
      return budget.toPlainObject();
    } catch (error) {
      console.error('Error al obtener el presupuesto:', error);
      throw error;
    }
  }

  async getBudgetByClientId(clientId: number) {
    try {
      if (!clientId || clientId <= 0) throw new Error('ID de cliente inválido.');
      const budgets = await budgetRepository.findByClientId(clientId);
      return budgets.map((b) => b.toPlainObject());
    } catch (error) {
      console.error('Error al obtener presupuestos por cliente:', error);
      throw error;
    }
  }

  async createBudget(budgetData: BudgetData) {
    try {
      const { client_id, user_id, date } = budgetData;

      let items: BudgetItem[];
      if (budgetData.items) {
        items = budgetData.items;
      } else if (budgetData.products) {
        console.warn('Legacy');
        items = budgetData.products.map(p => ({ product_id: p.product_id, template_id: p.template_id, quantity: Number(p.quantity), unit_price: Number(p.unit_price) }));
      } else {
        throw new Error('El presupuesto debe incluir items (productos o plantillas).');
      }

      if (!client_id || client_id <= 0) throw new Error('ID de cliente inválido.');
      if (!user_id || user_id <= 0) throw new Error('ID de usuario inválido.');
      if (!date) throw new Error('La fecha es requerida');
      if (!items || !Array.isArray(items) || items.length === 0) throw new Error('La orden debe contener al menos un producto o plantilla');

      const client = await clientRepository.findById(client_id);
      if (!client) throw new Error('El cliente especificado no existe');
      const user = await userRepository.findById(user_id);
      if (!user) throw new Error('El usuario especificado no existe');

      const orderDate = new Date(date);
      if (isNaN(orderDate.getTime())) throw new Error('Fecha de orden inválida');

      for (const [index, item] of items.entries()) {
        const hasProduct = item.product_id != null;
        const hasTemplate = item.template_id != null;
        if (!hasProduct && !hasTemplate) throw new Error(`Item ${index + 1}: Debe especificar un product_id o template_id`);
        if (hasProduct && hasTemplate) throw new Error(`Item ${index + 1}: No puede tener tanto product_id como template_id`);
        if (!item.quantity || isNaN(item.quantity) || item.quantity < 0.0001) throw new Error(`Item ${index + 1}: Cantidad inválida`);
        if (item.unit_price === undefined || item.unit_price === null || isNaN(item.unit_price) || item.unit_price < 0) throw new Error(`Item ${index + 1}: Precio unitario inválido`);
        if (hasProduct) { const e = await productRepository.findById(item.product_id!); if (!e) throw new Error(`Item ${index + 1}: El producto especificado no existe`); }
        if (hasTemplate) { const e = await productTemplateRepository.findById(item.template_id!); if (!e) throw new Error(`Item ${index + 1}: La plantilla especificada no existe`); }
      }

      const budgetToCreate = {
        client_id,
        user_id,
        date: orderDate.toISOString(),
        items: items.map(item => ({
          product_id: item.product_id ? item.product_id : null,
          template_id: item.template_id ? item.template_id : null,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      };

      const transaction = db.transaction(async () => {
        const budget = await budgetRepository.create(budgetToCreate);
        if (!budget) throw new Error('Error al crear presupuesto');
        return budget.toPlainObject();
      });

      return await transaction();
    } catch (error) {
      console.error('Error al crear el presupuesto:', error);
      throw error;
    }
  }

  async updateBudget(id: number, budgetData: BudgetData) {
    try {
      if (!id || id <= 0) throw new Error('ID de presupuesto inválido');
      const existingBudget = await budgetRepository.findById(id);
      if (!existingBudget) throw new Error('Presupuesto no encontrado');
      if (!existingBudget.canEdit()) throw new Error('No se puede editar un presupuesto convertido a orden');

      const { date, client_id, edited_by, items } = budgetData;

      if (date) { const d = new Date(date); if (isNaN(d.getTime())) throw new Error('Fecha de presupuesto inválida'); }
      if (client_id) {
        if (client_id <= 0) throw new Error('ID de cliente inválido');
        const client = await clientRepository.findById(client_id);
        if (!client) throw new Error('El cliente especificado no existe');
      }
      if (edited_by) {
        if (edited_by <= 0) throw new Error('ID de usuario editor inválido');
        const editorUser = await userRepository.findById(edited_by);
        if (!editorUser) throw new Error('El usuario editor especificado no existe');
      }

      if (items) {
        if (!Array.isArray(items)) throw new Error('El campo "items" debe ser un array');
        if (items.length === 0) throw new Error('El presupuesto debe contener al menos un producto o plantilla');
        for (const [index, item] of items.entries()) {
          const hasProduct = item.product_id != null; const hasTemplate = item.template_id != null;
          if (!hasProduct && !hasTemplate) throw new Error(`Item ${index + 1}: Debe especificar un product_id o template_id`);
          if (hasProduct && hasTemplate) throw new Error(`Item ${index + 1}: No puede tener tanto product_id como template_id`);
          if (!item.quantity || isNaN(item.quantity) || item.quantity < 0.0001) throw new Error(`Item ${index + 1}: Cantidad inválida`);
          if (item.unit_price == null || isNaN(item.unit_price) || item.unit_price < 0) throw new Error(`Item ${index + 1}: Precio unitario inválido`);
          if (hasProduct) { const e = await productRepository.findById(item.product_id!); if (!e) throw new Error(`Item ${index + 1}: El producto especificado no existe`); }
          if (hasTemplate) { const e = await productTemplateRepository.findById(item.template_id!); if (!e) throw new Error(`Item ${index + 1}: La plantilla especificada no existe`); }
        }
      }

      const updatePayload: BudgetData = {
        date: date ? new Date(date).toISOString() : existingBudget.date,
        client_id: client_id ? client_id : existingBudget.client_id,
        edited_by: edited_by ? edited_by : existingBudget.edited_by,
      };

      if (items) {
        updatePayload.items = items.map(item => ({
          product_id: item.product_id ? item.product_id : null,
          template_id: item.template_id ? item.template_id : null,
          quantity: item.quantity,
          unit_price: item.unit_price
        }));
      }

      const transaction = db.transaction(async () => {
        const updatedBudget = await budgetRepository.update(id, updatePayload);
        if (!updatedBudget) throw new Error('Error al actualizar presupuesto');
        return updatedBudget.toPlainObject();
      });

      return await transaction();
    } catch (error) {
      console.error('Error al actualizar presupuesto:', error);
      throw error;
    }
  }

  async deleteBudget(id: number) {
    try {
      if (!id || id <= 0) throw new Error('ID de presupuesto inválido.');
      const existingBudget = await budgetRepository.findById(id);
      if (!existingBudget) throw new Error('El presupuesto que intenta eliminar no existe.');
      const deleted = await budgetRepository.delete(id);
      if (!deleted) throw new Error('No se pudo eliminar el presupuesto.');
    } catch (error) {
      console.error('Error al eliminar el presupuesto:', error);
      throw error;
    }
  }

  async getBudgetProducts(budgetId: number) {
    try {
      if (!budgetId || budgetId <= 0) throw new Error('ID de presupuesto inválido.');
      return await budgetRepository.getBudgetProducts(budgetId);
    } catch (error) {
      console.error('Error al obtener los productos del presupuesto:', error);
      throw error;
    }
  }

  async recalculateBudgetTotal(id: number) {
    try {
      if (!id || id <= 0) throw new Error('ID de presupuesto inválido.');
      const existingBudget = await budgetRepository.findById(id);
      if (!existingBudget) throw new Error('El presupuesto que intenta recalcular no existe.');
      const newTotal = await budgetRepository.recalculateTotal(id);
      return { budgetId: id, newTotal, formattedTotal: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(newTotal) };
    } catch (error) {
      console.error('Error al recalcular el total del presupuesto:', error);
      throw error;
    }
  }

  async transformToOrder(budgetId: number, userId: number) {
    try {
      if (!budgetId || budgetId <= 0) throw new Error('ID de presupuesto inválido.');
      if (!userId || userId <= 0) throw new Error('ID de usuario inválido.');

      const existingBudget = await budgetRepository.findById(budgetId);
      if (!existingBudget) throw new Error('El presupuesto no existe.');
      if (existingBudget.converted_to_order) throw new Error('Este presupuesto ya fue convertido a orden.');

      const user = await userRepository.findById(userId);
      if (!user) throw new Error('El usuario especificado no existe.');

      const transaction = db.transaction(async () => {
        const orderId = await budgetRepository.transformToOrder(budgetId, userId);
        const order = await orderRepository.findById(orderId);
        if (!order) throw new Error('Error al obtener la orden creada');
        return order.toPlainObject();
      });

      return await transaction();
    } catch (error) {
      console.error('Error al transformar presupuesto a orden:', error);
      throw error;
    }
  }

  async getNextId(): Promise<number> {
    try {
      return await budgetRepository.getNextId();
    } catch (error) {
      console.error('Error al obtener el próximo ID de presupuesto:', error);
      throw new Error('No se pudo obtener el próximo ID de presupuesto.');
    }
  }
}

export default new BudgetService();
