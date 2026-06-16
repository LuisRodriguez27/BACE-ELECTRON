// eslint-disable-next-line @typescript-eslint/no-require-imports
const budgetRepository = require('../repositories/budgetRepository');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const clientRepository = require('../repositories/clientRepository');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const userRepository = require('../repositories/userRepository');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const productRepository = require('../repositories/productRepository');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const productTemplateRepository = require('../repositories/productTemplateRepository');

interface BudgetItem {
  product_id?: number | string | null;
  template_id?: number | string | null;
  quantity: number | string;
  unit_price: number | string;
}

interface BudgetData {
  client_id?: number | string;
  user_id?: number | string;
  date?: string;
  edited_by?: number | string | null;
  items?: BudgetItem[];
  products?: Array<{ product_id?: number | string | null; template_id?: number | string | null; quantity: number | string; unit_price: number | string }>;
}

class BudgetService {
  async getAllBudgets() {
    try {
      const budgets = await budgetRepository.findAll();
      return budgets.map((b: { toPlainObject: () => unknown }) => b.toPlainObject());
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
      return { data: result.data.map((b: { toPlainObject: () => unknown }) => b.toPlainObject()), pagination: result.pagination, searchTerm: result.searchTerm };
    } catch (error) {
      console.error('Error al obtener presupuestos paginados:', error);
      throw new Error('Error al obtener presupuestos paginados');
    }
  }

  async getBudgetById(id: number | string) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de presupuesto inválido.');
      const budget = await budgetRepository.findById(id);
      if (!budget) throw new Error('Presupuesto no encontrado.');
      return budget.toPlainObject();
    } catch (error) {
      console.error('Error al obtener el presupuesto:', error);
      throw new Error('No se pudo obtener el presupuesto.');
    }
  }

  async getBudgetByClientId(clientId: number | string) {
    try {
      if (!clientId || isNaN(Number(clientId))) throw new Error('ID de cliente inválido.');
      const budgets = await budgetRepository.findByClientId(parseInt(String(clientId)));
      return budgets.map((b: { toPlainObject: () => unknown }) => b.toPlainObject());
    } catch (error) {
      console.error('Error al obtener presupuestos por cliente:', error);
      throw new Error('No se pudieron obtener los presupuestos del cliente.');
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
        items = budgetData.products.map(p => ({ product_id: p.product_id, template_id: p.template_id, quantity: p.quantity, unit_price: p.unit_price }));
      } else {
        throw new Error('El presupuesto debe incluir items (productos o plantillas).');
      }

      if (!client_id || isNaN(Number(client_id))) throw new Error('ID de cliente inválido.');
      if (!user_id || isNaN(Number(user_id))) throw new Error('ID de usuario inválido.');
      if (!date) throw new Error('La fecha es requerida');
      if (!items || !Array.isArray(items) || items.length === 0) throw new Error('La orden debe contener al menos un producto o plantilla');

      const client = await clientRepository.findById(parseInt(String(client_id)));
      if (!client) throw new Error('El cliente especificado no existe');
      const user = await userRepository.findById(parseInt(String(user_id)));
      if (!user) throw new Error('El usuario especificado no existe');

      const orderDate = new Date(date);
      if (isNaN(orderDate.getTime())) throw new Error('Fecha de orden inválida');

      for (const [index, item] of items.entries()) {
        const hasProduct = item.product_id != null;
        const hasTemplate = item.template_id != null;
        if (!hasProduct && !hasTemplate) throw new Error(`Item ${index + 1}: Debe especificar un product_id o template_id`);
        if (hasProduct && hasTemplate) throw new Error(`Item ${index + 1}: No puede tener tanto product_id como template_id`);
        if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) < 0.0001) throw new Error(`Item ${index + 1}: Cantidad inválida`);
        if (item.unit_price === undefined || item.unit_price === null || isNaN(Number(item.unit_price)) || Number(item.unit_price) < 0) throw new Error(`Item ${index + 1}: Precio unitario inválido`);
        if (hasProduct) { const e = await productRepository.findById(parseInt(String(item.product_id))); if (!e) throw new Error(`Item ${index + 1}: El producto especificado no existe`); }
        if (hasTemplate) { const e = await productTemplateRepository.findById(parseInt(String(item.template_id))); if (!e) throw new Error(`Item ${index + 1}: La plantilla especificada no existe`); }
      }

      const budgetToCreate = { client_id: parseInt(String(client_id)), user_id: parseInt(String(user_id)), date: orderDate.toISOString(), items: items.map(item => ({ product_id: item.product_id ? parseInt(String(item.product_id)) : null, template_id: item.template_id ? parseInt(String(item.template_id)) : null, quantity: parseFloat(String(item.quantity)), unit_price: parseFloat(String(item.unit_price)) })) };
      const budget = await budgetRepository.create(budgetToCreate);
      return budget.toPlainObject();
    } catch (error) {
      console.error('Error al crear el presupuesto:', error);
      throw new Error('No se pudo crear el presupuesto.');
    }
  }

  async updateBudget(id: number | string, budgetData: BudgetData) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de presupuesto inválido');
      const budgetId = parseInt(String(id));
      const existingBudget = await budgetRepository.findById(budgetId);
      if (!existingBudget) throw new Error('Presupuesto no encontrado');
      if (!existingBudget.canEdit()) throw new Error('No se puede editar un presupuesto convertido a orden');

      const { date, client_id, edited_by, items } = budgetData;

      if (date) { const d = new Date(date); if (isNaN(d.getTime())) throw new Error('Fecha de presupuesto inválida'); }
      if (client_id) {
        if (isNaN(Number(client_id))) throw new Error('ID de cliente inválido');
        const client = await clientRepository.findById(parseInt(String(client_id)));
        if (!client) throw new Error('El cliente especificado no existe');
      }
      if (edited_by) {
        if (isNaN(Number(edited_by))) throw new Error('ID de usuario editor inválido');
        const editorUser = await userRepository.findById(parseInt(String(edited_by)));
        if (!editorUser) throw new Error('El usuario editor especificado no existe');
      }

      if (items) {
        if (!Array.isArray(items)) throw new Error('El campo "items" debe ser un array');
        if (items.length === 0) throw new Error('El presupuesto debe contener al menos un producto o plantilla');
        for (const [index, item] of items.entries()) {
          const hasProduct = item.product_id != null; const hasTemplate = item.template_id != null;
          if (!hasProduct && !hasTemplate) throw new Error(`Item ${index + 1}: Debe especificar un product_id o template_id`);
          if (hasProduct && hasTemplate) throw new Error(`Item ${index + 1}: No puede tener tanto product_id como template_id`);
          if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) < 0.0001) throw new Error(`Item ${index + 1}: Cantidad inválida`);
          if (item.unit_price == null || isNaN(Number(item.unit_price)) || Number(item.unit_price) < 0) throw new Error(`Item ${index + 1}: Precio unitario inválido`);
          if (hasProduct) { const e = await productRepository.findById(parseInt(String(item.product_id))); if (!e) throw new Error(`Item ${index + 1}: El producto especificado no existe`); }
          if (hasTemplate) { const e = await productTemplateRepository.findById(parseInt(String(item.template_id))); if (!e) throw new Error(`Item ${index + 1}: La plantilla especificada no existe`); }
        }
      }

      const updatePayload: Record<string, unknown> = {
        date: date ? new Date(date).toISOString() : existingBudget.date,
        client_id: client_id ? parseInt(String(client_id)) : existingBudget.client_id,
        edited_by: edited_by ? parseInt(String(edited_by)) : existingBudget.edited_by,
      };

      if (items) {
        updatePayload.items = items.map(item => ({ product_id: item.product_id ? parseInt(String(item.product_id)) : null, template_id: item.template_id ? parseInt(String(item.template_id)) : null, quantity: parseFloat(String(item.quantity)), unit_price: parseFloat(String(item.unit_price)) }));
      }

      const updatedBudget = await budgetRepository.update(budgetId, updatePayload);
      return updatedBudget.toPlainObject();
    } catch (error) {
      console.error('Error al actualizar presupuesto:', error);
      throw error;
    }
  }

  async deleteBudget(id: number | string) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de presupuesto inválido.');
      const budgetId = parseInt(String(id));
      const existingBudget = await budgetRepository.findById(budgetId);
      if (!existingBudget) throw new Error('El presupuesto que intenta eliminar no existe.');
      const deleted = await budgetRepository.delete(budgetId);
      if (!deleted) throw new Error('No se pudo eliminar el presupuesto.');
    } catch (error) {
      console.error('Error al eliminar el presupuesto:', error);
      throw new Error('No se pudo eliminar el presupuesto.');
    }
  }

  async getBudgetProducts(budgetId: number | string) {
    try {
      if (!budgetId || isNaN(Number(budgetId))) throw new Error('ID de presupuesto inválido.');
      return await budgetRepository.getBudgetProducts(parseInt(String(budgetId)));
    } catch (error) {
      console.error('Error al obtener los productos del presupuesto:', error);
      throw new Error('No se pudieron obtener los productos del presupuesto.');
    }
  }

  async recalculateBudgetTotal(id: number | string) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de presupuesto inválido.');
      const budgetId = parseInt(String(id));
      const existingBudget = await budgetRepository.findById(budgetId);
      if (!existingBudget) throw new Error('El presupuesto que intenta recalcular no existe.');
      const newTotal = await budgetRepository.recalculateTotal(budgetId);
      return { budgetId, newTotal, formattedTotal: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(newTotal as number) };
    } catch (error) {
      console.error('Error al recalcular el total del presupuesto:', error);
      throw new Error('No se pudo recalcular el total del presupuesto.');
    }
  }

  async transformToOrder(budgetId: number | string, userId: number | string) {
    try {
      if (!budgetId || isNaN(Number(budgetId))) throw new Error('ID de presupuesto inválido.');
      if (!userId || isNaN(Number(userId))) throw new Error('ID de usuario inválido.');

      const parsedBudgetId = parseInt(String(budgetId));
      const parsedUserId = parseInt(String(userId));

      const existingBudget = await budgetRepository.findById(parsedBudgetId);
      if (!existingBudget) throw new Error('El presupuesto no existe.');
      if (existingBudget.converted_to_order) throw new Error('Este presupuesto ya fue convertido a orden.');

      const user = await userRepository.findById(parsedUserId);
      if (!user) throw new Error('El usuario especificado no existe.');

      const orderId = await budgetRepository.transformToOrder(parsedBudgetId, parsedUserId);

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const orderRepository = require('../repositories/orderRepository');
      const order = await orderRepository.findById(orderId);
      return order.toPlainObject();
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

module.exports = new BudgetService();
export {};
