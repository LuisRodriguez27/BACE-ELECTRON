const budgetRepository = require('../repositories/budgetRepository');
const clientRepository = require('../repositories/clientRepository');
const userRepository = require('../repositories/userRepository');
const productRepository = require('../repositories/productRepository');
const productTemplateRepository = require('../repositories/productTemplateRepository');
const Budget = require('../domain/budget');

class BudgetService {
  async getAllBudgets() {
    try {
      const budgets = await budgetRepository.findAll();
      return budgets.map(budget => budget.toPlainObject());
    } catch (error) {
      console.error('Error al obtener presupuestos:', error);
      throw new Error('No se pudieron obtener los presupuestos.');

    }
  }

  async getBudgetById(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de presupuesto inválido.');
      }

      const budget = budgetRepository.findById(id);
      if (!budget) {
        throw new Error('Presupuesto no encontrado.');
      }

      return budget.toPlainObject();
    } catch (error) {
      console.error('Error al obtener el presupuesto:', error);
      throw new Error('No se pudo obtener el presupuesto.');
    }
  }

  async getBudgetByClientId(clientId) {
    try {
      if (!clientId || isNaN(clientId)) {
        throw new Error('ID de cliente inválido.');
      }
      const budgets = budgetRepository.findByClientId(parseInt(clientId));
      return budgets.map(budget => budget.toPlainObject());
    } catch (error) {
      console.error('Error al obtener presupuestos por cliente:', error);
      throw new Error('No se pudieron obtener los presupuestos del cliente.');
    }
  }

  async createBudget(budgetData) {
    try {
      const { client_id, user_id, date } = budgetData;

      let items;
      if (budgetData.items) {
        items = budgetData.items;
      } else if (budgetData.products) {
        console.warn('Legacy');
        items = budgetData.products.map(products => ({
          product_id: products.product_id,
          template_id: products.template_id,
          quantity: products.quantity,
          unit_price: products.unit_price
        }));
      } else {
        throw new Error('El presupuesto debe incluir items (productos o plantillas).');
      }

      if (!client_id || isNaN(client_id)) {
        throw new Error('ID de cliente inválido.');
      }

      if (!user_id || isNaN(user_id)) {
        throw new Error('ID de usuario inválido.');
      }

      if (!date) {
        throw new Error('La fecha es requerida');
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error('La orden debe contener al menos un producto o plantilla');
      }

      // Verificar que el cliente existe
      const client = clientRepository.findById(parseInt(client_id));
      if (!client) {
        throw new Error('El cliente especificado no existe');
      }

      // Verificar que el usuario existe
      const user = userRepository.findById(parseInt(user_id));
      if (!user) {
        throw new Error('El usuario especificado no existe');
      }

      // Validar fecha
      const orderDate = new Date(date);
      if (isNaN(orderDate.getTime())) {
        throw new Error('Fecha de orden inválida');
      }

      for (const [index, item] of items.entries()) {
        // Verificar que tenga product_id O template_id (no ambos, no ninguno)
        const hasProduct = item.product_id !== null && item.product_id !== undefined;
        const hasTemplate = item.template_id !== null && item.template_id !== undefined;

        if (!hasProduct && !hasTemplate) {
          throw new Error(`Item ${index + 1}: Debe especificar un product_id o template_id`);
        }

        if (hasProduct && hasTemplate) {
          throw new Error(`Item ${index + 1}: No puede tener tanto product_id como template_id`);
        }

        // Validar cantidad
        if (!item.quantity || isNaN(item.quantity) || item.quantity < 1) {
          throw new Error(`Item ${index + 1}: Cantidad inválida`);
        }

        // Validar precio unitario
        if (item.unit_price === undefined || item.unit_price === null || isNaN(item.unit_price) || item.unit_price < 0) {
          throw new Error(`Item ${index + 1}: Precio unitario inválido`);
        }

        // Verificar que el producto o plantilla existe
        if (hasProduct) {
          const productExists = productRepository.findById(parseInt(item.product_id));
          if (!productExists) {
            throw new Error(`Item ${index + 1}: El producto especificado no existe`);
          }
        }

        if (hasTemplate) {
          const templateExists = productTemplateRepository.findById(parseInt(item.template_id));
          if (!templateExists) {
            throw new Error(`Item ${index + 1}: La plantilla especificada no existe`);
          }
        }
      }

      const budgetToCreate = {
        client_id: parseInt(client_id),
        user_id: parseInt(user_id),
        date: orderDate.toISOString(),
        items: items.map(item => ({
          product_id: item.product_id ? parseInt(item.product_id) : null,
          template_id: item.template_id ? parseInt(item.template_id) : null,
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price)
        }))
      }

      const budget = budgetRepository.create(budgetToCreate);
      return budget.toPlainObject();

    } catch (error) {
      console.error('Error al crear el presupuesto:', error);
      throw new Error('No se pudo crear el presupuesto.');
    }
  }

  async deleteBudget(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de presupuesto inválido.');
      }

      const budgetId = parseInt(id);

      const existingBudget = budgetRepository.findById(budgetId);
      if (!existingBudget) {
        throw new Error('El presupuesto que intenta eliminar no existe.');
      }

      const deleted = budgetRepository.delete(budgetId);
      if (!deleted) {
        throw new Error('No se pudo eliminar el presupuesto.');
      }

    } catch (error) {
      console.error('Error al eliminar el presupuesto:', error);
      throw new Error('No se pudo eliminar el presupuesto.');
    } 
  }

  async getBudgetProducts(budgetId) {
    try {
      if (!budgetId || isNaN(budgetId)) {
        throw new Error('ID de presupuesto inválido.');
      }

      const product = budgetRepository.getBudgetProducts(parseInt(budgetId));
      return product;
    } catch (error) {
      console.error('Error al obtener los productos del presupuesto:', error);
      throw new Error('No se pudieron obtener los productos del presupuesto.');
    }
  }

  async recalculateBudgetTotal(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de presupuesto inválido.');
      }

      const budgetId = parseInt(id);

      const existingBudget = budgetRepository.findById(budgetId);
      if (!existingBudget) {
        throw new Error('El presupuesto que intenta recalcular no existe.');
      }

      const newTotal = budgetRepository.recalculateTotal(budgetId);

      return {
        budgetId,
        newTotal,
        formattedTotal: new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: 'MXN',
          minimumFractionDigits: 2
        }).format(newTotal)
      };
    } catch (error) {
      console.error('Error al recalcular el total del presupuesto:', error);
      throw new Error('No se pudo recalcular el total del presupuesto.');
    }
  }

  async transformToOrder(budgetId, userId) {
    try {
      if (!budgetId || isNaN(budgetId)) {
        throw new Error('ID de presupuesto inválido.');
      }

      if (!userId || isNaN(userId)) {
        throw new Error('ID de usuario inválido.');
      }

      const parsedBudgetId = parseInt(budgetId);
      const parsedUserId = parseInt(userId);

      // Verificar que el presupuesto existe
      const existingBudget = budgetRepository.findById(parsedBudgetId);
      if (!existingBudget) {
        throw new Error('El presupuesto no existe.');
      }

      // Verificar que el presupuesto no haya sido convertido ya
      if (existingBudget.converted_to_order) {
        throw new Error('Este presupuesto ya fue convertido a orden.');
      }

      // Verificar que el usuario existe
      const user = userRepository.findById(parsedUserId);
      if (!user) {
        throw new Error('El usuario especificado no existe.');
      }

      // Transformar el presupuesto a orden
      const orderId = budgetRepository.transformToOrder(parsedBudgetId, parsedUserId);

      // Obtener la orden creada usando el orderRepository
      const orderRepository = require('../repositories/orderRepository');
      const order = orderRepository.findById(orderId);

      return {
        success: true,
        orderId: orderId,
        budgetId: parsedBudgetId,
        message: `Presupuesto #${parsedBudgetId} convertido exitosamente a orden #${orderId}`,
        order: order ? order.toPlainObject() : null
      };
    } catch (error) {
      console.error('Error al transformar presupuesto a orden:', error);
      throw error;
    }
  }

}

module.exports = new BudgetService();
