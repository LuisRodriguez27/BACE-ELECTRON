import type { ProductionLogRow, ProductionLogResponsable } from '../types/domain';

class ProductionLog {
  id: number;
  order_id: number | null;
  created_by: number | null;
  delivery_at: string;
  cantidad: number;
  descripcion: string;
  responsable: ProductionLogResponsable;
  completado: boolean;
  created_at: string | null;
  active: boolean;
  client_name: string | null;
  creator_name: string | null;

  constructor({
    id,
    order_id,
    created_by,
    delivery_at,
    cantidad,
    descripcion,
    responsable,
    completado = false,
    created_at = null,
    active = true,
    client_name = null,
    creator_name = null
  }: ProductionLogRow) {
    this.id = id;
    this.order_id = order_id || null;
    this.created_by = created_by || null;
    this.delivery_at = delivery_at;
    this.cantidad = cantidad !== undefined && cantidad !== null ? parseFloat(String(cantidad)) : 0;
    this.descripcion = descripcion;
    this.responsable = responsable;
    this.completado = completado === true || completado === 1 || completado === 'true';
    this.created_at = created_at;
    this.active = active;
    this.client_name = client_name || null;
    this.creator_name = creator_name || null;
  }

  isActive(): boolean {
    return this.active === true;
  }

  toPlainObject() {
    return {
      id: this.id,
      order_id: this.order_id,
      created_by: this.created_by,
      delivery_at: this.delivery_at,
      cantidad: this.cantidad,
      descripcion: this.descripcion,
      responsable: this.responsable,
      completado: this.completado,
      created_at: this.created_at,
      active: this.active,
      client_name: this.client_name,
      creator_name: this.creator_name
    };
  }
}

export default ProductionLog;
