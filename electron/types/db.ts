/**
 * Tipos para el objeto `db` exportado por electron/db.js
 * Representa el wrapper sobre el Pool de PostgreSQL.
 */

import type { QueryResultRow } from 'pg';

export interface DbExecuteResult {
  /** Número de filas afectadas por la consulta (UPDATE, DELETE, INSERT). */
  changes: number | null;
  /** ID de la fila insertada (solo para INSERT ... RETURNING *). */
  lastInsertRowid: number | null;
}

export interface Db {
  /**
   * Ejecuta una consulta y devuelve la primera fila, o null si no hay resultados.
   */
  getOne<T extends QueryResultRow = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;

  /**
   * Ejecuta una consulta y devuelve todas las filas como array.
   */
  getAll<T extends QueryResultRow = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;

  /**
   * Ejecuta INSERT, UPDATE o DELETE.
   * Los INSERT reciben RETURNING * automáticamente si no lo tienen.
   */
  execute(sql: string, params?: unknown[]): Promise<DbExecuteResult>;

  /**
   * Ejecuta SQL crudo sin transformaciones. Se usa internamente.
   */
  exec(sql: string): Promise<unknown>;

  /**
   * Envuelve una función en una transacción de PostgreSQL.
   * Usa AsyncLocalStorage para propagar el PoolClient dentro del contexto.
   *
   * @example
   * const txCreate = db.transaction(async () => { ... });
   * await txCreate();
   */
  transaction<T>(
    fn: (...args: unknown[]) => Promise<T>
  ): (...args: unknown[]) => Promise<T>;
}
