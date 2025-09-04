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

  async getSales() {
    try {
      const sales = orderRepository.findCompleted();
      return sales.map(sale => sale.toPlainObject());
    } catch (error) {
      console.error('Error al obtener ventas:', error);
      throw new Error('Error al obtener ventas');
    }
  }  

  async createOrder({ client_id, user_id, date, estimated_delivery_date, status, products, notes }) {
    try {
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

      if (!products || !Array.isArray(products) || products.length === 0) {
        throw new Error('La orden debe contener al menos un producto');
      }

      // Verificar que el cliente exists
      const client = clientRepository.findById(parseInt(client_id));
      if (!client) {
        throw new Error('El cliente especificado no existe');
      }

      // Verificar que el usuario exists
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
        if (deliveryDate < orderDate) {
          throw new Error('La fecha de entrega no puede ser anterior a la fecha de la orden');
        }
      }

      // Validar estado
      const validStatus = status || 'pendiente';
      if (!Order.isValidStatus(validStatus)) {
        throw new Error('Estado de orden inválido');
      }

      // Validar productos
      for (const [index, product] of products.entries()) {
        if (!product.product_id || isNaN(product.product_id)) {
          throw new Error(`Producto ${index + 1}: ID de producto inválido`);
        }

        if (!product.quantity || isNaN(product.quantity) || product.quantity < 1) {
          throw new Error(`Producto ${index + 1}: Cantidad inválida`);
        }

        // Verificar que el producto exists
        const productExists = productRepository.findById(parseInt(product.product_id));
        if (!productExists) {
          throw new Error(`Producto ${index + 1}: El producto especificado no existe`);
        }

        // Si hay template_id, verificar que exists
        if (product.template_id) {
          if (isNaN(product.template_id)) {
            throw new Error(`Producto ${index + 1}: ID de plantilla inválido`);
          }
          const templateExists = productTemplateRepository.findById(parseInt(product.template_id));
          if (!templateExists) {
            throw new Error(`Producto ${index + 1}: La plantilla especificada no existe`);
          }
        }
      }

      // Crear orden
      const order = orderRepository.create({
        client_id: parseInt(client_id),
        user_id: parseInt(user_id),
        date: orderDate.toISOString(),
        estimated_delivery_date: estimated_delivery_date ? new Date(estimated_delivery_date).toISOString() : null,
        status: validStatus,
        notes: notes?.trim() || null,
        products: products.map(p => ({
          product_id: parseInt(p.product_id),
          template_id: p.template_id ? parseInt(p.template_id) : null,
          quantity: parseInt(p.quantity)
        }))
      });

      return order.toPlainObject();

    } catch (error) {
      console.error('Error al crear orden:', error);
      throw error;
    }
  }

  async updateOrder(id, { estimated_delivery_date, status, notes, edited_by }) {
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

      // Validar fecha estimada de entrega si se proporciona
      if (estimated_delivery_date) {
        const deliveryDate = new Date(estimated_delivery_date);
        if (isNaN(deliveryDate.getTime())) {
          throw new Error('Fecha estimada de entrega inválida');
        }
        const orderDate = new Date(existingOrder.date);
        if (deliveryDate < orderDate) {
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

      // Actualizar orden
      const updated = orderRepository.update(orderId, {
        estimated_delivery_date: estimated_delivery_date ? new Date(estimated_delivery_date).toISOString() : null,
        status: status || null,
        notes: notes?.trim() || null,
        edited_by: edited_by ? parseInt(edited_by) : null
      });

      if (!updated) {
        throw new Error('Error al actualizar orden');
      }

      // Obtener orden actualizada
      const updatedOrder = orderRepository.findById(orderId);
      
      if (!updatedOrder) {
        throw new Error('Error: no se pudo recuperar la orden actualizada');
      }
      
      const result = updatedOrder.toPlainObject();
      
      // Validar que el resultado tenga las propiedades necesarias
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
