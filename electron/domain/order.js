class Order {
  constructor({ 
    id, 
    client_id, 
    user_id, 
    edited_by, 
    date, 
    estimated_delivery_date, 
    status, 
    total, 
    notes, 
    active = 1,
    client_name,
    client_phone,
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
    this.total = parseFloat(total) || 0;
    this.notes = notes || null;
    this.active = active;
    
    // Información adicional del cliente y usuarios
    this.client_name = client_name || null;
    this.client_phone = client_phone || null;
    this.user_username = user_username || null;
    this.edited_by_username = edited_by_username || null;
    this.orderProducts = orderProducts || [];
  }

  // Estados válidos
  static VALID_STATUSES = ['pendiente', 'en proceso', 'completado', 'cancelado'];
  
  static STATUS = {
    PENDIENTE: 'pendiente',
    EN_PROCESO: 'en proceso',
    COMPLETADO: 'completado',
    CANCELADO: 'cancelado'
  };

  // Métodos de utilidad para el dominio
  isActive() {
    return this.active === 1;
  }

  isPending() {
    return this.status === Order.STATUS.PENDIENTE;
  }

  isInProgress() {
    return this.status === Order.STATUS.EN_PROCESO;
  }

  isCompleted() {
    return this.status === Order.STATUS.COMPLETADO;
  }

  isCancelled() {
    return this.status === Order.STATUS.CANCELADO;
  }

  hasEstimatedDelivery() {
    return this.estimated_delivery_date && this.estimated_delivery_date.trim().length > 0;
  }

  hasNotes() {
    return this.notes && this.notes.trim().length > 0;
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

  // Información del cliente
  getClient() {
    return {
      id: this.client_id,
      name: this.client_name,
      phone: this.client_phone
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
      return sum + (parseFloat(product.unit_price) * parseInt(product.quantity));
    }, 0);
  }

  // Validar consistencia
  isValid() {
    return (
      this.client_id && 
      this.client_id > 0 && 
      this.user_id && 
      this.user_id > 0 && 
      Order.isValidStatus(this.status) &&
      typeof this.total === 'number' && 
      this.total >= 0 && 
      !isNaN(this.total)
    );
  }

  // Estado de la orden
  getStatusColor() {
    const colors = {
      'pendiente': 'yellow',
      'en proceso': 'blue',
      'completado': 'green',
      'cancelado': 'red'
    };
    return colors[this.status] || 'gray';
  }

  getStatusLabel() {
    const labels = {
      'pendiente': 'Pendiente',
      'en proceso': 'En Proceso',
      'completado': 'Completado',
      'cancelado': 'Cancelado'
    };
    return labels[this.status] || this.status;
  }

  // Información del display
  getDisplayName() {
    return `Orden #${this.id} - ${this.client_name}`;
  }

  getDisplaySummary() {
    const productsCount = this.orderProducts?.length || 0;
    const productsText = productsCount === 1 ? 'producto' : 'productos';
    return `${productsCount} ${productsText} - ${this.getFormattedTotal()}`;
  }

  // Para búsquedas y filtros
  matchesSearchTerm(searchTerm) {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      (this.client_name && this.client_name.toLowerCase().includes(term)) ||
      (this.client_phone && this.client_phone.includes(term)) ||
      (this.notes && this.notes.toLowerCase().includes(term)) ||
      (this.status && this.status.toLowerCase().includes(term)) ||
      (this.id && this.id.toString().includes(term))
    );
  }

  // Verificaciones de negocio
  canEdit() {
    return !this.isCompleted() && !this.isCancelled();
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
      total: this.total,
      notes: this.notes,
      active: this.active,
      client: this.getClient(),
      user: this.getUser(),
      editedByUser: this.getEditedByUser(),
      orderProducts: this.orderProducts
    };
  }
}

module.exports = Order;
