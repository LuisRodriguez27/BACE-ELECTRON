class Order {
  constructor({ 
    id, 
    client_id, 
    user_id, 
    edited_by, 
    date, 
    estimated_delivery_date, 
    status,
    responsable, 
    total, 
    notes, 
    description,
    active = 1,
    client_name,
    client_phone,
    client_color,
    user_username,
    edited_by_username,
    orderProducts = []
  }) {
    this.id = id;
    this.client_id = client_id;
    this.user_id = user_id;
    this.edited_by = edited_by || null;
    this.date = date;
    this.estimated_delivery_date = estimated_delivery_date || null;
    this.status = status || 'pendiente';
    this.responsable = responsable || null;
    this.total = parseFloat(total) || 0;
    this.notes = notes || null;
    this.description = description || null;
    this.active = active;
    
    // Información adicional del cliente y usuarios
    this.client_name = client_name || null;
    this.client_phone = client_phone || null;
    this.client_color = client_color || null;
    this.user_username = user_username || null;
    this.edited_by_username = edited_by_username || null;
    this.orderProducts = orderProducts || [];
  }

  // Estados válidos
  static VALID_STATUSES = ['Revision', 'Diseño', 'Produccion', 'Entrega', 'Completado', 'Cancelado'];
  
  static STATUS = {
    REVISION: 'Revision',
    DISENO: 'Diseño',
    PRODUCCION: 'Produccion',
    ENTREGA: 'Entrega',
    COMPLETADO: 'Completado',
    CANCELADO: 'Cancelado'
  };

  // Responsables válidos
  static VALID_RESPONSABLES = ['Mostrador', 'Maquila'];

  static RESPONSABLE = {
    MOSTRADOR: 'Mostrador',
    MAQUILA: 'Maquila'
  };

  // Métodos de utilidad para el dominio
  isActive() {
    return this.active === 1;
  }

  isRevision() {
    return this.status === Order.STATUS.REVISION;
  }

  isDesign() {
    return this.status === Order.STATUS.DISENO;
  }

  isProduction() {
    return this.status === Order.STATUS.PRODUCCION;
  }

  isDelivery() {
    return this.status === Order.STATUS.ENTREGA;
  }

  isCompleted() {
    return this.status === Order.STATUS.COMPLETADO;
  }

  isCancelled() {
    return this.status === Order.STATUS.CANCELADO;
  }

  hasResponsable() {
    return this.responsable && this.responsable.trim().length > 0;
  }

  hasEstimatedDelivery() {
    return this.estimated_delivery_date && this.estimated_delivery_date.trim().length > 0;
  }

  hasNotes() {
    return this.notes && this.notes.trim().length > 0;
  }

  hasDescription() {
    return this.description && this.description.trim().length > 0;
  }

  hasProducts() {
    return this.orderProducts && this.orderProducts.length > 0;
  }

  wasEdited() {
    return this.edited_by !== null;
  }

  // Validar estado
  static isValidStatus(status) {
    return Order.VALID_STATUSES.includes(status);
  }

  // Validar responsable
  static isValidResponsable(responsable) {
    return Order.VALID_RESPONSABLES.includes(responsable);
  }

  // Información del cliente
  getClient() {
    return {
      id: this.client_id,
      name: this.client_name,
      phone: this.client_phone,
      color: this.client_color
    };
  }

  // Información del usuario
  getUser() {
    return {
      id: this.user_id,
      username: this.user_username
    };
  }

  // Información del usuario que editó
  getEditedByUser() {
    if (!this.edited_by) return null;
    return {
      id: this.edited_by,
      username: this.edited_by_username
    };
  }

  // Formatear fechas
  getFormattedDate() {
    if (!this.date) return '';
    return new Date(this.date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getFormattedEstimatedDelivery() {
    if (!this.estimated_delivery_date) return '';
    return new Date(this.estimated_delivery_date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Formatear total
  getFormattedTotal() {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(this.total);
  }

  // Calcular total basado en productos
  calculateTotalFromProducts() {
    if (!this.hasProducts()) return 0;
    
    return this.orderProducts.reduce((sum, product) => {
      return sum + (parseFloat(product.unit_price) * parseFloat(product.quantity));
    }, 0);
  }

  // Validar consistencia
  isValid() {
    return (
      this.client_id && 
      this.user_id && 
      this.user_id > 0 && 
      Order.isValidStatus(this.status) &&
      Order.isValidResponsable(this.responsable) &&
      this.responsable.trim().length > 0 &&
      typeof this.total === 'number' && 
      this.total >= 0 && 
      !isNaN(this.total) &&
      this.hasProducts() // Una orden siempre debe tener productos
    );
  }

  // Validar que la orden tenga items (productos o plantillas)
  hasItems() {
    return this.hasProducts();
  }

  // Contar productos directos
  getProductsCount() {
    if (!this.orderProducts) return 0;
    return this.orderProducts.filter(item => item.product_id !== null).length;
  }

  // Contar plantillas
  getTemplatesCount() {
    if (!this.orderProducts) return 0;
    return this.orderProducts.filter(item => item.template_id !== null).length;
  }

  // Obtener total de items
  getTotalItemsCount() {
    if (!this.orderProducts) return 0;
    return this.orderProducts.length;
  }

  // Obtener total de cantidad (suma de todas las cantidades)
  getTotalQuantity() {
    if (!this.orderProducts) return 0;
    return this.orderProducts.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }

  // Estado de la orden
  getStatusColor() {
    const colors = {
      'Revision': 'yellow',
      'Diseño': 'orange',
      'Produccion': 'blue',
      'Entrega': 'cyan',
      'Completado': 'green',
      'Cancelado': 'red'
    };
    return colors[this.status] || 'gray';
  }

  getStatusLabel() {
    const labels = {
      'Revision': 'Revisión',
      'Diseño': 'Diseño',
      'Produccion': 'Producción',
      'Entrega': 'Entrega',
      'Completado': 'Completado',
      'Cancelado': 'Cancelado'
    };
    return labels[this.status] || this.status;
  }

  getResposable() {
    return this.responsable || "Mostrador";
  }

  // Información del display
  getDisplayName() {
    return `Orden #${this.id} - ${this.client_name}`;
  }

  getDisplaySummary() {
    const totalItems = this.getTotalItemsCount();
    const totalQuantity = this.getTotalQuantity();
    const productsCount = this.getProductsCount();
    const templatesCount = this.getTemplatesCount();
    
    let summary = '';
    if (productsCount > 0 && templatesCount > 0) {
      summary = `${productsCount} productos, ${templatesCount} plantillas`;
    } else if (productsCount > 0) {
      const text = productsCount === 1 ? 'producto' : 'productos';
      summary = `${productsCount} ${text}`;
    } else if (templatesCount > 0) {
      const text = templatesCount === 1 ? 'plantilla' : 'plantillas';
      summary = `${templatesCount} ${text}`;
    }
    
    if (totalQuantity > totalItems) {
      summary += ` (${totalQuantity} unidades)`;
    }
    
    return `${summary} - ${this.getFormattedTotal()}`;
  }

  // Para búsquedas y filtros
  matchesSearchTerm(searchTerm) {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      (this.client_name && this.client_name.toLowerCase().includes(term)) ||
      (this.client_phone && this.client_phone.includes(term)) ||
      (this.notes && this.notes.toLowerCase().includes(term)) ||
      (this.description && this.description.toLowerCase().includes(term)) ||
      (this.status && this.status.toLowerCase().includes(term)) ||
      (this.id && this.id.toString().includes(term))
    );
  }

  // Verificaciones de negocio
  canEdit() {
    return !this.isCompleted() && !this.isCancelled();
  }

  canEditProducts() {
    // Los productos NUNCA se pueden editar una vez creada la orden
    return false;
  }

  canCancel() {
    return !this.isCompleted() && !this.isCancelled();
  }

  canComplete() {
    return !this.isCompleted() && !this.isCancelled();
  }

  toPlainObject() {
    return {
      id: this.id,
      client_id: this.client_id,
      user_id: this.user_id,
      edited_by: this.edited_by,
      date: this.date,
      estimated_delivery_date: this.estimated_delivery_date,
      status: this.status,
      responsable: this.responsable,
      total: this.total,
      notes: this.notes,
      description: this.description,
      active: this.active,
      client_name: this.client_name, // Exponer nombre directamente
      client: this.getClient(),
      user: this.getUser(),
      editedByUser: this.getEditedByUser(),
      orderProducts: this.orderProducts
    };
  }
}

module.exports = Order;
