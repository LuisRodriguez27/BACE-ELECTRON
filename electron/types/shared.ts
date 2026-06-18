/**
 * Tipos transversales compartidos entre agregados.
 * No pertenecen a ninguna entidad de dominio específica.
 */

// ─── Paginación ────────────────────────────────────────────────────────────

/** Metadatos de paginación devueltos por los repositorios. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number | string;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
  searchTerm?: string;
}
