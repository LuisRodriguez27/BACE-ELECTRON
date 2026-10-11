import type { PrintLogRow, PrintLogStatus, PrintLogResponsable } from '../types/domain';

class PrintLog {
  id: number;
  order_id: number | null;
  descripcion: string;
  hora_entrega: string;
  responsable: PrintLogResponsable;
  observaciones: string | null;
  envio: string;
  pago: number | null;
  completado: boolean;
  status: PrintLogStatus;
  created_at: string | null;
  active: boolean;
  client_name: string | null;

  constructor({ id, order_id, descripcion, hora_entrega, responsable, observaciones, envio, pago, completado = false, status = 'Pendiente', created_at = null, active = true, client_name = null }: PrintLogRow) {
    this.id = id;
    this.order_id = order_id || null;
    this.descripcion = descripcion;
    this.hora_entrega = hora_entrega;
    this.responsable = responsable;
    this.observaciones = observaciones || null;
    this.envio = envio;
    this.pago = pago !== undefined && pago !== null ? parseFloat(String(pago)) : null;
    this.completado = completado === true || completado === 1 || completado === 'true';
    this.status = status || 'Pendiente';
    this.created_at = created_at;
    this.active = active;
    this.client_name = client_name || null;
  }

  isActive(): boolean { return this.active === true; }

  toPlainObject() {
    return { id: this.id, order_id: this.order_id, descripcion: this.descripcion, hora_entrega: this.hora_entrega, responsable: this.responsable, observaciones: this.observaciones, envio: this.envio, pago: this.pago, completado: this.completado, status: this.status, created_at: this.created_at, active: this.active, client_name: this.client_name };
  }
}

export default PrintLog;
