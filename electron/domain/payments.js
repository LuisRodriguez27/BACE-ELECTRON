class Payment {
  constructor({ 
    id, 
    order_id, 
    amount, 
    date, 
    descripcion,
    order = null 
  }) {
    this.id = id;
    this.order_id = order_id;
    this.amount = parseFloat(amount) || 0;
    this.date = date;
    this.descripcion = descripcion || null;
    this.order = order;
  }

  // Métodos de utilidad para el dominio
  hasOrder() {
    return this.order !== null && this.order !== undefined;
  }

  hasDescription() {
    return this.descripcion && this.descripcion.trim().length > 0;
  }

  // Validar cantidad
  isValidAmount() {
    return typeof this.amount === 'number' && this.amount > 0 && !isNaN(this.amount);
  }

  // Validar fecha
  isValidDate() {
    if (!this.date) return false;
    const paymentDate = new Date(this.date);
    return !isNaN(paymentDate.getTime());
  }

  // Formatear cantidad
  getFormattedAmount() {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(this.amount);
  }

  // Formatear fecha
  getFormattedDate() {
    if (!this.date) return '';
    return new Date(this.date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getFormattedDateTime() {
    if (!this.date) return '';
    return new Date(this.date).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Información de la orden asociada
  getOrder() {
    if (!this.hasOrder()) return null;
    return {
      id: this.order.id,
      client_id: this.order.client_id,
      status: this.order.status,
      total: this.order.total
    };
  }

  // Validar consistencia del pago
  isValid() {
    return (
      this.order_id && 
      this.order_id > 0 && 
      this.isValidAmount() && 
      this.isValidDate()
    );
  }

  // Para búsquedas y filtros
  matchesSearchTerm(searchTerm) {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      (this.descripcion && this.descripcion.toLowerCase().includes(term)) ||
      (this.amount && this.amount.toString().includes(term)) ||
      (this.id && this.id.toString().includes(term)) ||
      (this.order_id && this.order_id.toString().includes(term))
    );
  }

  // Información del display
  getDisplayName() {
    const orderInfo = this.hasOrder() ? ` - Orden #${this.order.id}` : ` - Orden #${this.order_id}`;
    return `Pago #${this.id}${orderInfo}`;
  }

  getDisplaySummary() {
    const description = this.hasDescription() ? this.descripcion : 'Sin descripción';
    return `${this.getFormattedAmount()} - ${description}`;
  }

  // Verificaciones de negocio
  canEdit() {
    // Un pago se puede editar si la orden asociada no está completada/cancelada
    if (this.hasOrder()) {
      return this.order.status !== 'completado' && this.order.status !== 'cancelado';
    }
    return true; // Si no hay orden, se puede editar
  }

  canDelete() {
    // Similar lógica que para editar
    return this.canEdit();
  }

  // Comparar con el monto total de la orden
  isPartialPayment() {
    if (!this.hasOrder()) return false;
    return this.amount < this.order.total;
  }

  isFullPayment() {
    if (!this.hasOrder()) return false;
    return this.amount >= this.order.total;
  }

  isOverPayment() {
    if (!this.hasOrder()) return false;
    return this.amount > this.order.total;
  }

  // Estado del pago basado en el monto
  getPaymentStatus() {
    if (!this.hasOrder()) return 'unknown';
    
    if (this.isOverPayment()) return 'overpaid';
    if (this.isFullPayment()) return 'full';
    if (this.isPartialPayment()) return 'partial';
    
    return 'unknown';
  }

  getPaymentStatusLabel() {
    const status = this.getPaymentStatus();
    const labels = {
      'full': 'Pago Completo',
      'partial': 'Pago Parcial',
      'overpaid': 'Sobrepago',
      'unknown': 'Desconocido'
    };
    return labels[status] || status;
  }

  getPaymentStatusColor() {
    const status = this.getPaymentStatus();
    const colors = {
      'full': 'green',
      'partial': 'yellow',
      'overpaid': 'orange',
      'unknown': 'gray'
    };
    return colors[status] || 'gray';
  }

  toPlainObject() {
    return {
      id: this.id,
      order_id: this.order_id,
      amount: this.amount,
      date: this.date,
      descripcion: this.descripcion,
      order: this.getOrder(),
      formattedAmount: this.getFormattedAmount(),
      formattedDate: this.getFormattedDate(),
      formattedDateTime: this.getFormattedDateTime(),
      paymentStatus: this.getPaymentStatus(),
      paymentStatusLabel: this.getPaymentStatusLabel(),
      canEdit: this.canEdit(),
      canDelete: this.canDelete()
    };
  }
}

module.exports = Payment;
