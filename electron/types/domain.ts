/**
 * Barrel de re-exportación — compatibilidad con imports existentes.
 *
 * Los tipos ahora viven en su propio archivo por agregado (espejando domain/).
 * Este archivo permite que las clases de dominio y repositorios sigan usando:
 *   import type { OrderRow } from '../types/domain';
 * sin necesidad de cambiar sus imports.
 */

export * from './shared';
export * from './auth';
export * from './user';
export * from './permission';
export * from './client';
export * from './product';
export * from './productTemplate';
export * from './order';
export * from './payment';
export * from './budget';
export * from './simpleOrder';
export * from './cashSession';
export * from './expense';
export * from './supplier';
export * from './supplierOrder';
export * from './printLog';
export * from './stats';
