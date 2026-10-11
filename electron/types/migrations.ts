import type { PoolClient } from 'pg';
import type { Db } from './db';

/**
 * Estructura de una migración individual del sistema de versionado de BACE.
 *
 * Reglas del sistema (de migrations.js):
 *  - Cada migración se ejecuta UNA SOLA VEZ y queda registrada en schema_migrations.
 *  - NUNCA se modifican ni eliminan migraciones ya aplicadas.
 *  - El campo `isApplied` es opcional: detecta el estado real de una BD pre-versionada.
 *    Si no se provee, la migración se asume aplicada en el bootstrap.
 */
export interface Migration {
  /** Número de versión único. Debe ser estrictamente incremental. */
  version: number;

  /** Nombre descriptivo en snake_case (ej: 'add_product_price_columns'). */
  name: string;

  /**
   * Función opcional de detección de estado para BDs pre-versionadas.
   * Si devuelve `true`, la migración ya está aplicada y no se ejecuta `up`.
   * Si devuelve `false`, la migración está pendiente y se ejecuta `up`.
   *
   * Las migraciones sin este campo (v1-v7) se asumen aplicadas durante el bootstrap
   * si la BD ya tiene datos.
   */
  isApplied?: (client: PoolClient) => Promise<boolean>;

  /**
   * Función que aplica la migración.
   * Siempre recibe el `PoolClient` crudo (no el wrapper `db`) para
   * garantizar que todas las queries estén dentro de la misma transacción.
   */
  up: (client: PoolClient) => Promise<void>;
}

/**
 * Firma de la función principal del runner de migraciones.
 * Se llama desde db.ts al inicializar la base de datos.
 */
export type RunMigrationsFn = (db: Db, client: PoolClient) => Promise<void>;
