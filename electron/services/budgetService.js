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

  async getBudgetsPaginated(page = 1, limit = 10, searchTerm = '') {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 10;
      
      const result = budgetRepository.findAllPaginated(page, limit, searchTerm);
      
      return {
        data: result.data.map(budget => budget.toPlainObject()),
        pagination: result.pagination,
        searchTerm: result.searchTerm
      };
    } catch (error) {
      console.error('Error al obtener presupuestos paginados:', error);
      throw new Error('Error al obtener presupuestos paginados');
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
        if (!item.quantity || isNaN(item.quantity) || item.quantity < 0.0001) {
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
          quantity: parseFloat(item.quantity),
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

  async updateBudget(id, budgetData) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de presupuesto inválido');
      }

      const budgetId = parseInt(id);

      // Verificar si el presupuesto existe
      const existingBudget = budgetRepository.findById(budgetId);
      if (!existingBudget) {
        throw new Error('Presupuesto no encontrado');
      }

      // Validar que se puede editar
      if (!existingBudget.canEdit()) {
        throw new Error('No se puede editar un presupuesto convertido a orden');
      }

      const { date, client_id, edited_by, items } = budgetData;

      // Validar fecha si se proporciona
      if (date) {
        const budgetDate = new Date(date);
        if (isNaN(budgetDate.getTime())) {
           throw new Error('Fecha de presupuesto inválida');
        }
      }

       // Validar cliente si se proporciona
      if (client_id) {
         if (isNaN(client_id)) {
            throw new Error('ID de cliente inválido');
         }
         const client = clientRepository.findById(parseInt(client_id));
         if (!client) {
            throw new Error('El cliente especificado no existe');
         }
      }

      // Validar usuario editor si se proporciona
      if (edited_by) {
        if (isNaN(edited_by)) {
          throw new Error('ID de usuario editor inválido');
        }
        const editorUser = userRepository.findById(parseInt(edited_by));
        if (!editorUser) {
          throw new Error('El usuario editor especificado no existe');
        }
      }

      // Validar y procesar items si se reciben
      if (items) {
        if (!Array.isArray(items)) {
          throw new Error('El campo "items" debe ser un array');
        }
        if (items.length === 0) {
          throw new Error('El presupuesto debe contener al menos un producto o plantilla');
        }
        for (const [index, item] of items.entries()) {
          const hasProduct = item.product_id != null;
          const hasTemplate = item.template_id != null;
          if (!hasProduct && !hasTemplate) {
            throw new Error(`Item ${index + 1}: Debe especificar un product_id o template_id`);
          }
          if (hasProduct && hasTemplate) {
            throw new Error(`Item ${index + 1}: No puede tener tanto product_id como template_id`);
          }
          if (!item.quantity || isNaN(item.quantity) || item.quantity < 0.0001) {
            throw new Error(`Item ${index + 1}: Cantidad inválida`);
          }
          if (item.unit_price == null || isNaN(item.unit_price) || item.unit_price < 0) {
            throw new Error(`Item ${index + 1}: Precio unitario inválido`);
          }
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
      }

      // Construir payload para actualizar, preservando valores existentes
      const updatePayload = {
        date: date ? new Date(date).toISOString() : existingBudget.date,
        client_id: client_id ? parseInt(client_id) : existingBudget.client_id,
        edited_by: edited_by ? parseInt(edited_by) : existingBudget.edited_by
      };

      if (items) {
        updatePayload.items = items.map(item => ({
          product_id: item.product_id ? parseInt(item.product_id) : null,
          template_id: item.template_id ? parseInt(item.template_id) : null,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price)
        }));
      }

      const updatedBudget = budgetRepository.update(budgetId, updatePayload);

      return updatedBudget.toPlainObject();
    } catch (error) {
      console.error('Error al actualizar presupuesto:', error);
      throw error;
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

      return order.toPlainObject();
    } catch (error) {
      console.error('Error al transformar presupuesto a orden:', error);
      throw error;
    }
  }

  async getNextId() {
    try {
      return budgetRepository.getNextId();
    } catch (error) {
      console.error('Error al obtener el próximo ID de presupuesto:', error);
      throw new Error('No se pudo obtener el próximo ID de presupuesto.');
    }
  }

}

module.exports = new BudgetService();
