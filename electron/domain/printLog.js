class PrintLog {
  constructor({
    id,
    order_id,
    descripcion,
    hora_entrega,
    responsable,
    observaciones,
    envio,
    pago,
    maquila_completada = false,
    mostrador_completado = false,
    status = 'Pendiente',
    created_at = null,
    active = true,
    // Joined properties
    client_name = null
  }) {
    this.id = id;
    this.order_id = order_id || null;
    this.descripcion = descripcion;
    this.hora_entrega = hora_entrega;
    this.responsable = responsable;
    this.observaciones = observaciones || null;
    this.envio = envio;
    this.pago = pago !== undefined && pago !== null ? parseFloat(pago) : null;
    this.maquila_completada = maquila_completada === true || maquila_completada === 1 || maquila_completada === 'true';
    this.mostrador_completado = mostrador_completado === true || mostrador_completado === 1 || mostrador_completado === 'true';
    this.status = status || 'Pendiente';
    this.created_at = created_at;
    this.active = active;

    // Joined properties
    this.client_name = client_name || null;
  }

  isActive() {
    return this.active === true;
  }

  toPlainObject() {
    return {
      id: this.id,
      order_id: this.order_id,
      descripcion: this.descripcion,
      hora_entrega: this.hora_entrega,
      responsable: this.responsable,
      observaciones: this.observaciones,
      envio: this.envio,
      pago: this.pago,
      maquila_completada: this.maquila_completada,
      mostrador_completado: this.mostrador_completado,
      status: this.status,
      created_at: this.created_at,
      active: this.active,
      client_name: this.client_name
    };
  }
}

module.exports = PrintLog;
