const db = require('../db');
const Order = require('../domain/order');

class OrderRepository {

  findAll() {
    const stmt = db.prepare(`
      SELECT o.id, o.client_id, o.user_id, o.edited_by, o.date, 
            o.estimated_delivery_date, o.status, o.total, o.notes, o.active,
            c.name as client_name, c.phone as client_phone,
            u.username as user_username,
            ue.username as edited_by_username
      FROM orders o
      JOIN clients c ON o.client_id = c.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN users ue ON o.edited_by = ue.id
      WHERE o.active = 1 AND o.status NOT IN ('completado', 'cancelado')
      ORDER BY o.id DESC
    `);
    
    const orders = stmt.all();
    return orders.map(order => {
      // Cargar productos para cada orden
      const orderProducts = this.getOrderProducts(order.id);
      return new Order({ ...order, orderProducts });
    });
  }

  findById(id) {
    const orderData = db.prepare(`
      SELECT o.id, o.client_id, o.user_id, o.edited_by, o.date, 
            o.estimated_delivery_date, o.status, o.total, o.notes, o.active,
            c.name as client_name, c.phone as client_phone,
            u.username as user_username,
            ue.username as edited_by_username
      FROM orders o
      JOIN clients c ON o.client_id = c.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN users ue ON o.edited_by = ue.id
      WHERE o.id = ? AND o.active = 1
    `).get(id);

    if (!orderData) return null;

    const orderProducts = this.getOrderProducts(id);

    return new Order({ ...orderData, orderProducts });
  }

  findByClientId(clientId) {
    const stmt = db.prepare(`
      SELECT o.id, o.client_id, o.user_id, o.edited_by, o.date, 
            o.estimated_delivery_date, o.status, o.total, o.notes, o.active,
            c.name as client_name, c.phone as client_phone,
            u.username as user_username,
            ue.username as edited_by_username
      FROM orders o
      JOIN clients c ON o.client_id = c.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN users ue ON o.edited_by = ue.id
      WHERE o.client_id = ? AND o.active = 1
      ORDER BY o.id DESC
    `);

    const orders = stmt.all(clientId);
    return orders.map(order => {
      // Cargar productos para cada orden
      const orderProducts = this.getOrderProducts(order.id);
      return new Order({ ...order, orderProducts });
    });
  }

  findCompleted() {
    const stmt = db.prepare(`
      SELECT o.id, o.client_id, o.user_id, o.edited_by, o.date, 
            o.estimated_delivery_date, o.status, o.total, o.notes, o.active,
            c.name as client_name, c.phone as client_phone,
            u.username as user_username,
            ue.username as edited_by_username
      FROM orders o
      JOIN clients c ON o.client_id = c.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN users ue ON o.edited_by = ue.id
      WHERE o.active = 1 AND o.status = 'completado'
      ORDER BY o.id DESC
    `);
    
    const orders = stmt.all();
    return orders.map(order => {
      // Cargar productos para cada orden
      const orderProducts = this.getOrderProducts(order.id);
      return new Order({ ...order, orderProducts });
    });
  }

  findCompletedPaginated(page = 1, limit = 10, searchTerm = '') {
    const offset = (page - 1) * limit;
    
    // Construir la condición de búsqueda
    let searchCondition = '';
    let searchParams = [];
    
    if (searchTerm && searchTerm.trim()) {
      const term = `%${searchTerm.trim()}%`;
      searchCondition = `
        AND (
          CAST(o.id AS TEXT) LIKE ?
          OR o.notes LIKE ?
          OR c.name LIKE ?
          OR c.phone LIKE ?
        )
      `;
      searchParams = [term, term, term, term];
    }
    
    // Obtener total de registros con búsqueda
    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      JOIN clients c ON o.client_id = c.id
      WHERE o.active = 1 AND o.status = 'completado' ${searchCondition}
    `;
    const countStmt = db.prepare(countQuery);
    const { total } = countStmt.get(...searchParams);
    
    // Obtener registros paginados con búsqueda
    const dataQuery = `
      SELECT o.id, o.client_id, o.user_id, o.edited_by, o.date, 
            o.estimated_delivery_date, o.status, o.total, o.notes, o.active,
            c.name as client_name, c.phone as client_phone,
            u.username as user_username,
            ue.username as edited_by_username
      FROM orders o
      JOIN clients c ON o.client_id = c.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN users ue ON o.edited_by = ue.id
      WHERE o.active = 1 AND o.status = 'completado' ${searchCondition}
      ORDER BY o.id DESC
      LIMIT ? OFFSET ?
    `;
    const stmt = db.prepare(dataQuery);
    const orders = stmt.all(...searchParams, limit, offset);
    
    const ordersWithProducts = orders.map(order => {
      const orderProducts = this.getOrderProducts(order.id);
      return new Order({ ...order, orderProducts });
    });
    
    return {
      data: ordersWithProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      searchTerm
    };
  }

  /**
   * Crear una nueva orden con productos/plantillas obligatorios
   * La orden NUNCA se crea vacía, siempre debe tener al menos un producto o plantilla
   * Una vez creada, los productos/plantillas no se pueden editar
   */
  create(orderData) {
    // Validar que se proporcionen productos o plantillas
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      throw new Error('Una orden debe tener al menos un producto o plantilla');
    }

    // Validar que cada item tenga los datos necesarios
    this.validateOrderItems(orderData.items);

    // Iniciar transacción para garantizar consistencia
    const transaction = db.transaction(() => {
      // Crear la orden
      const orderStmt = db.prepare(`
        INSERT INTO orders (client_id, user_id, date, estimated_delivery_date, status, total, notes)
        VALUES (?, ?, ?, ?, ?, 0, ?)
      `);
      
      const orderResult = orderStmt.run(
        orderData.client_id,
        orderData.user_id,
        orderData.date,
        orderData.estimated_delivery_date || null,
        orderData.status || 'pendiente',
        orderData.notes || null
      );

      const orderId = orderResult.lastInsertRowid;

      // Agregar productos/plantillas a la orden
      this.addItemsToOrder(orderId, orderData.items);

      // Recalcular y actualizar el total
      this.recalculateTotal(orderId);

      return orderId;
    });

    const orderId = transaction();
    return this.findById(orderId);
  }

  /**
   * Validar que los items de la orden tengan la estructura correcta
   */
  validateOrderItems(items) {
    for (const item of items) {
      // Verificar que tenga product_id O template_id (no ambos, no ninguno)
      const hasProduct = item.product_id !== null && item.product_id !== undefined;
      const hasTemplate = item.template_id !== null && item.template_id !== undefined;
      
      if (!hasProduct && !hasTemplate) {
        throw new Error('Cada item debe tener un product_id o template_id');
      }
      
      if (hasProduct && hasTemplate) {
        throw new Error('Un item no puede tener tanto product_id como template_id');
      }

      // Verificar que tenga cantidad y precio
      if (!item.quantity || item.quantity <= 0) {
        throw new Error('Cada item debe tener una cantidad válida mayor a 0');
      }

      if (!item.unit_price || item.unit_price <= 0) {
        throw new Error('Cada item debe tener un precio unitario válido mayor a 0');
      }
    }
  }

  /**
   * Agregar items (productos/plantillas) a una orden
   * Solo se usa durante la creación inicial
   */
  addItemsToOrder(orderId, items) {
    const stmt = db.prepare(`
      INSERT INTO order_products (order_id, product_id, template_id, quantity, unit_price, total_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      const productId = item.product_id || null;
      const templateId = item.template_id || null;
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unit_price);
      const totalPrice = quantity * unitPrice;

      stmt.run(orderId, productId, templateId, quantity, unitPrice, totalPrice);
    }
  }

  /**
   * Actualizar una orden
   */
  update(id, orderData) {
    // Verificar que la orden existe y puede ser editada
    const existingOrder = this.findById(id);
    if (!existingOrder) {
      throw new Error('La orden no existe');
    }

    if (existingOrder.isCompleted() || existingOrder.isCancelled()) {
      throw new Error('No se puede editar una orden completada o cancelada');
    }

    // Actualizar campos permitidos de la orden
    const stmt = db.prepare(`
      UPDATE orders
      SET estimated_delivery_date = ?, status = ?, notes = ?, edited_by = ?
      WHERE id = ? AND active = 1
    `);
    stmt.run(
      orderData.estimated_delivery_date || null,
      orderData.status || null,
      orderData.notes || null,
      orderData.edited_by || null,
      id
    );

    // Si se reciben items, actualizar productos/plantillas de la orden
    if (orderData.items && Array.isArray(orderData.items)) {
      // Validar los nuevos items
      this.validateOrderItems(orderData.items);

      // Eliminar los productos/plantillas actuales de la orden
      db.prepare('DELETE FROM order_products WHERE order_id = ?').run(id);

      // Agregar los nuevos productos/plantillas
      this.addItemsToOrder(id, orderData.items);

      // Recalcular el total
      this.recalculateTotal(id);
    }

    // Retornar la orden actualizada
    return this.findById(id);
  }

  delete(id) {
    const stmt = db.prepare('UPDATE orders SET active = 0 WHERE id = ?');
    const result = stmt.run(id);
    
    return result.changes > 0;
  }

  getOrderProducts(orderId) {
    const stmt = db.prepare(`
      SELECT 
        op.*,
        -- Para productos directos
        p.name as product_name, 
        p.serial_number,
        p.price as product_price,
        p.description as product_description,
        -- Para plantillas
        pt.width as template_width,
        pt.height as template_height,
        pt.colors as template_colors,
        pt.position as template_position,
        pt.texts as template_texts,
        pt.description as template_description,
        pt.final_price as template_final_price,
        u.username as template_created_by_username,
        -- Nombre del producto base para plantillas
        p_template.name as template_base_product_name
      FROM order_products op
      LEFT JOIN products p ON op.product_id = p.id
      LEFT JOIN product_templates pt ON op.template_id = pt.id
      LEFT JOIN products p_template ON pt.product_id = p_template.id
      LEFT JOIN users u ON pt.created_by = u.id
      WHERE op.order_id = ?
      ORDER BY op.id
    `);

    return stmt.all(orderId);
  }

  /**
   * Recalcular el total de una orden basándose en sus productos
   */
  recalculateTotal(orderId) {
    const totalQuery = db.prepare(`
      SELECT SUM(total_price) as total
      FROM order_products
      WHERE order_id = ?
    `).get(orderId);

    const newTotal = totalQuery.total || 0;

    db.prepare(`
      UPDATE orders
      SET total = ?
      WHERE id = ?
    `).run(newTotal, orderId);

    return newTotal;
  }

  /**
   * Verificar si una orden puede ser editada
   */
  canEditOrder(orderId) {
    const order = this.findById(orderId);
    return order && order.canEdit();
  }

  /**
   * Obtener el resumen de productos/plantillas de una orden
   */
  getOrderSummary(orderId) {
    const products = this.getOrderProducts(orderId);
    
    return {
      totalItems: products.length,
      totalQuantity: products.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: products.reduce((sum, item) => sum + item.total_price, 0),
      hasProducts: products.some(item => item.product_id !== null),
      hasTemplates: products.some(item => item.template_id !== null)
    };
  }

  /**
   * DEPRECATED: Mantener por compatibilidad pero con error
   * No se debe permitir agregar productos después de crear la orden
   */
  addProductsToOrder(orderId, products) {
    throw new Error('No se pueden agregar productos a una orden existente. Los productos solo se pueden agregar durante la creación inicial.');
  }
}

module.exports = new OrderRepository();