import type {
  AddCreditPaymentPayload,
  Credit,
  CreditFilters,
  CreditItem,
  CreditItemPayload,
  CreditSourceSearchResult,
  CreditStatement,
  CreateCreditPayload,
  PaginatedCredits,
  UpdateCreditItemPayload,
} from './types';

export const CreditApiService = {
  getAll: (page = 1, limit = 20, filters: CreditFilters = {}): Promise<PaginatedCredits> =>
    window.api.getCredits(page, limit, filters),

  getById: (id: number): Promise<Credit> => window.api.getCreditById(id),

  getOpenByClientId: (clientId: number): Promise<Credit | null> =>
    window.api.getOpenCreditByClientId(clientId),

  create: (data: CreateCreditPayload): Promise<Credit> => window.api.createCredit(data),

  addItem: (data: CreditItemPayload & { credit_id: number }): Promise<CreditItem> =>
    window.api.addCreditItem(data),

  updateItem: (id: number, data: UpdateCreditItemPayload): Promise<CreditItem> =>
    window.api.updateCreditItem(id, data),

  removeItem: (id: number): Promise<void> => window.api.removeCreditItem(id),

  addPayment: (data: AddCreditPaymentPayload) => window.api.addCreditPayment(data),

  updateNotes: (id: number, notes: string | null): Promise<Credit> =>
    window.api.updateCreditNotes(id, notes),

  close: (id: number, notes?: string | null): Promise<Credit> =>
    window.api.closeCredit(id, { notes }),

  reopen: (id: number): Promise<Credit> => window.api.reopenCredit(id),

  getStatement: (id: number, params: { from?: string | null; to: string }): Promise<CreditStatement> =>
    window.api.getCreditStatement(id, params),

  searchSources: (searchTerm = '', limit = 20, sourceType?: 'order' | 'simple_order'): Promise<CreditSourceSearchResult[]> =>
    window.api.searchCreditSources(searchTerm, limit, sourceType),
};
