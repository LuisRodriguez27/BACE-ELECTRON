const orderRepository = require('../repositories/orderRepository');
const clientRepository = require('../repositories/clientRepository');
const userRepository = require('../repositories/userRepository');
const productRepository = require('../repositories/productRepository');
const productTemplateRepository = require('../repositories/productTemplateRepository');
const Order = require('../domain/order');

class OrderService {

  async getAllOrders() {
    try {
      const orders = orderRepository.findAll();
      return orders.map(order => order.toPlainObject());
    } catch (error) {
      console.error('Error al obtener órdenes:', error);
      throw new Error('Error al obtener órdenes');
    }
  }

  async getOrderById(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de orden inválido');
      }

      const order = orderRepository.findById(parseInt(id));
      
      if (!order) {
        throw new Error('Orden no encontrada');
      }

      return order.toPlainObject();
    } catch (error) {
      console.error('Error al obtener orden:', error);
      throw error;
    }
  }

  async getOrdersByClientId(clientId) {
    try {
      if (!clientId || isNaN(clientId)) {
        throw new Error('ID de cliente inválido');
      }

      const orders = orderRepository.findByClientId(parseInt(clientId));
      return orders.map(order => order.toPlainObject());
    } catch (error) {
      console.error('Error al obtener órdenes del cliente:', error);
      throw error;
    }
  }

  async getPendingOrdersForLogbook() {
    try {
      const orders = orderRepository.findPendingForLogbook();
      return orders.map(order => order.toPlainObject());
    } catch (error) {
      console.error('Error al obtener bitácora de órdenes:', error);
      throw new Error('Error al obtener bitácora de órdenes');
    }
  }

  async getSales() {
    try {
      const sales = orderRepository.findCompleted();
      return sales.map(sale => sale.toPlainObject());
    } catch (error) {
      console.error('Error al obtener ventas:', error);
      throw new Error('Error al obtener ventas');
    }
  }

  async getSalesPaginated(page = 1, limit = 10, searchTerm = '') {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 10;
      
      const result = orderRepository.findCompletedPaginated(page, limit, searchTerm);
      
      return {
        data: result.data.map(sale => sale.toPlainObject()),
        pagination: result.pagination,
        searchTerm: result.searchTerm
      };
    } catch (error) {
      console.error('Error al obtener ventas paginadas:', error);
      throw new Error('Error al obtener ventas paginadas');
    }
  }  

  /**
   * Crear nueva orden con la estructura actualizada que soporta productos y plantillas
   * NUEVA IMPLEMENTACIÓN - soporta tanto 'products' (legacy) como 'items' (nuevo)
   */
  async createOrder(orderData) {
    try {
      const { client_id, user_id, date, estimated_delivery_date, status, notes, description } = orderData;
      
      // Detectar si usa la estructura legacy (products) o nueva (items)
      let items;
      if (orderData.items) {
        // Nueva estructura con items
        items = orderData.items;
      } else if (orderData.products) {
        // Estructura legacy - convertir products a items
        console.warn('Usando estructura legacy "products". Considera migrar a "items"');
        items = orderData.products.map(product => ({
          product_id: product.product_id,
          template_id: product.template_id || null,
          quantity: product.quantity,
          unit_price: product.unit_price || 0
        }));
      } else {
        throw new Error('Se requiere "items" o "products" en los datos de la orden');
      }

      // Validaciones de negocio
      if (!client_id || isNaN(client_id)) {
        throw new Error('ID de cliente inválido');
      }

      if (!user_id || isNaN(user_id)) {
        throw new Error('ID de usuario inválido');
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

      // Validar fecha estimada de entrega si se proporciona
      if (estimated_delivery_date) {
        const deliveryDate = new Date(estimated_delivery_date);
        if (isNaN(deliveryDate.getTime())) {
          throw new Error('Fecha estimada de entrega inválida');
        }
        
        // Normalizar fechas (ignorar horas) para evitar errores por diferencias de zona horaria
        const comparisonOrderDate = new Date(orderDate);
        comparisonOrderDate.setHours(0, 0, 0, 0);
        
        const comparisonDeliveryDate = new Date(deliveryDate);
        comparisonDeliveryDate.setHours(0, 0, 0, 0);

        if (comparisonDeliveryDate < comparisonOrderDate) {
          throw new Error('La fecha de entrega no puede ser anterior a la fecha de la orden');
        }
      }

      // Validar estado
      const validStatus = status || 'pendiente';
      if (!Order.isValidStatus(validStatus)) {
        throw new Error('Estado de orden inválido');
      }

      // Validar items (productos y plantillas)
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

      // Preparar datos para el repository (nueva estructura)
      const orderToCreate = {
        client_id: parseInt(client_id),
        user_id: parseInt(user_id),
        date: orderDate.toISOString(),
        estimated_delivery_date: estimated_delivery_date ? new Date(estimated_delivery_date).toISOString() : null,
        status: validStatus,
        notes: notes?.trim() || null,
        description: description?.trim() || null,
        items: items.map(item => ({
          product_id: item.product_id ? parseInt(item.product_id) : null,
          template_id: item.template_id ? parseInt(item.template_id) : null,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price)
        }))
      };

      // Crear orden usando el repository actualizado
      const order = orderRepository.create(orderToCreate);

      return order.toPlainObject();

    } catch (error) {
      console.error('Error al crear orden:', error);
      throw error;
    }
  }

  async updateOrder(id, orderData) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de orden inválido');
      }

      const orderId = parseInt(id);

      // Verificar si la orden existe
      const existingOrder = orderRepository.findById(orderId);
      if (!existingOrder) {
        throw new Error('Orden no encontrada');
      }

      // Validar que se puede editar
      if (!existingOrder.canEdit()) {
        throw new Error('No se puede editar una orden completada o cancelada');
      }

      const { estimated_delivery_date, status, notes, description, edited_by, items, client_id, date } = orderData;

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

      // Validar fecha estimada de entrega si se proporciona
      if (estimated_delivery_date) {
        const deliveryDate = new Date(estimated_delivery_date);
        if (isNaN(deliveryDate.getTime())) {
          throw new Error('Fecha estimada de entrega inválida');
        }
        const orderDate = date ? new Date(date) : new Date(existingOrder.date);
        
        // Normalizar fechas (ignorar horas) para evitar errores por diferencias de zona horaria
        const comparisonOrderDate = new Date(orderDate);
        comparisonOrderDate.setHours(0, 0, 0, 0);
        
        const comparisonDeliveryDate = new Date(deliveryDate);
        comparisonDeliveryDate.setHours(0, 0, 0, 0);

        if (comparisonDeliveryDate < comparisonOrderDate) {
          throw new Error('La fecha de entrega no puede ser anterior a la fecha de la orden');
        }
      }

      // Validar estado si se proporciona
      if (status && !Order.isValidStatus(status)) {
        throw new Error('Estado de orden inválido');
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
          throw new Error('La orden debe contener al menos un producto o plantilla');
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
        client_id: client_id ? parseInt(client_id) : existingOrder.client_id,
        date: date ? new Date(date).toISOString() : existingOrder.date,
        estimated_delivery_date: estimated_delivery_date ? new Date(estimated_delivery_date).toISOString() : existingOrder.estimated_delivery_date,
        status: status || existingOrder.status,
        notes: notes !== undefined ? (notes?.trim() || null) : existingOrder.notes,
        description: description !== undefined ? (description?.trim() || null) : existingOrder.description,
        edited_by: edited_by ? parseInt(edited_by) : existingOrder.edited_by
      };

      if (items) {
        updatePayload.items = items.map(item => ({
          product_id: item.product_id ? parseInt(item.product_id) : null,
          template_id: item.template_id ? parseInt(item.template_id) : null,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price)
        }));
      }

      const updatedOrder = orderRepository.update(orderId, updatePayload);

      if (!updatedOrder) {
        throw new Error('Error al actualizar orden');
      }

      const result = updatedOrder.toPlainObject();
      if (!result.id || !result.client_id) {
        console.error('Orden actualizada inválida:', result);
        throw new Error('Datos de la orden actualizada inválidos');
      }
      return result;
    } catch (error) {
      console.error('Error al actualizar orden:', error);
      throw error;
    }
  }

  async deleteOrder(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de orden inválido');
      }

      const orderId = parseInt(id);

      // Verificar si la orden existe
      const existingOrder = orderRepository.findById(orderId);
      if (!existingOrder) {
        throw new Error('Orden no encontrada');
      }

      // Lógica de negocio: verificar si se puede eliminar
      if (existingOrder.isCompleted()) {
        throw new Error('No se puede eliminar una orden completada. Considere cancelarla en su lugar.');
      }

      const deleted = orderRepository.delete(orderId);

      if (!deleted) {
        throw new Error('Error al eliminar orden');
      }

      // El frontend espera void, no retornamos nada
    } catch (error) {
      console.error('Error al eliminar orden:', error);
      throw error;
    }
  }

  async getOrderProducts(orderId) {
    try {
      if (!orderId || isNaN(orderId)) {
        throw new Error('ID de orden inválido');
      }

      const products = orderRepository.getOrderProducts(parseInt(orderId));
      return products;
    } catch (error) {
      console.error('Error al obtener productos de orden:', error);
      throw error;
    }
  }

  async recalculateOrderTotal(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de orden inválido');
      }

      const orderId = parseInt(id);

      // Verificar si la orden existe
      const existingOrder = orderRepository.findById(orderId);
      if (!existingOrder) {
        throw new Error('Orden no encontrada');
      }

      const newTotal = orderRepository.recalculateTotal(orderId);
      
      return {
        orderId,
        newTotal,
        formattedTotal: new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: 'MXN',
          minimumFractionDigits: 2
        }).format(newTotal)
      };

    } catch (error) {
      console.error('Error al recalcular total de orden:', error);
      throw error;
    }
  }
}

module.exports = new OrderService();