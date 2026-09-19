import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Eye,
  Loader2,
  Plus,
  Search,
  User,
  WalletCards,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import { formatDateMX } from '@/utils/dateUtils';
import { extractErrorMessage } from '@/utils/errorHandling';
import { CreditApiService } from './CreditApiService';
import type { Credit, CreditPagination, CreditStatus } from './types';
import CreateCreditModal from './components/CreateCreditModal';
import CreditDetailModal from './components/CreditDetailModal';

const PAGE_LIMIT = 20;

const money = (value: number) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
}).format(value);

const CreditsPage: React.FC = () => {
  const { canAccess, checkPermission } = usePermissions();
  const canView = canAccess('Ver Creditos');
  const canManage = canAccess('Gestionar Creditos');
  const [credits, setCredits] = useState<Credit[]>([]);
  const [pagination, setPagination] = useState<CreditPagination | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<CreditStatus | 'all'>('open');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    CreditApiService.getAll(page, PAGE_LIMIT, { searchTerm: debouncedSearch, status })
      .then(result => {
        if (cancelled) return;
        setCredits(result.data);
        setPagination(result.pagination);
      })
      .catch(err => {
        if (!cancelled) setError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [canView, debouncedSearch, page, reloadKey, status]);

  const handleCreditChanged = useCallback((updated: Credit) => {
    setCredits(current => current.map(credit => credit.id === updated.id ? updated : credit));
  }, []);

  const openCreate = () => {
    if (!checkPermission('Gestionar Creditos')) return;
    setCreateOpen(true);
  };

  if (!canView) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">
          No tienes permiso para consultar créditos.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><WalletCards className="text-blue-600" /> Créditos</h1>
          <p className="mt-1 text-gray-600">Administra cuentas, trabajos, abonos y cortes de crédito.</p>
        </div>
        {canManage && <Button onClick={openCreate} className="gap-2"><Plus size={16} /> Nuevo crédito</Button>}
      </div>

      <div className="mb-6 rounded-lg bg-white p-4 shadow">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar por ID, nombre o teléfono..."
            />
          </div>
          <select
            value={status}
            onChange={event => { setStatus(event.target.value as CreditStatus | 'all'); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="open">Créditos abiertos</option>
            <option value="closed">Créditos cerrados</option>
            <option value="all">Todos los créditos</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            {status === 'open' ? 'Cuentas abiertas' : status === 'closed' ? 'Cuentas cerradas' : 'Todas las cuentas'}
          </h2>
          {pagination && <span className="text-sm text-gray-500">{pagination.total} crédito{pagination.total === 1 ? '' : 's'}</span>}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-gray-500"><Loader2 className="animate-spin" size={22} /> Cargando créditos...</div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-700">{error}</p>
            <Button size="sm" className="mt-3" onClick={() => setReloadKey(value => value + 1)}>Reintentar</Button>
          </div>
        ) : credits.length === 0 ? (
          <div className="py-16 text-center">
            <WalletCards className="mx-auto mb-3 text-gray-300" size={44} />
            <h3 className="font-medium text-gray-900">No hay créditos que coincidan</h3>
            <p className="mt-1 text-sm text-gray-500">Cambia los filtros o crea una cuenta nueva.</p>
            {canManage && status !== 'closed' && <Button className="mt-4 gap-2" onClick={openCreate}><Plus size={15} /> Nuevo crédito</Button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Crédito</th>
                  <th className="px-4 py-3 text-left">Cliente titular</th>
                  <th className="px-4 py-3 text-left">Apertura</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Cargos</th>
                  <th className="px-4 py-3 text-right">Abonado</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                  <th className="px-4 py-3 text-center">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {credits.map(credit => (
                  <tr key={credit.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-600">#{credit.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600"><User size={14} /></span>
                        <span>
                          <span className="block font-medium text-gray-900">{credit.client_name || 'Sin nombre'}</span>
                          <span className="block text-xs text-gray-500">{credit.client_phone || 'Sin teléfono'} · ID {credit.client_id}</span>
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDateMX(credit.opened_at, 'DD/MM/YYYY HH:mm')}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${credit.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                        {credit.status === 'open' ? 'Abierto' : 'Cerrado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-blue-700">{money(credit.total_charges)}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">{money(credit.total_paid)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${credit.balance > 0.01 ? 'text-orange-700' : 'text-green-700'}`}>
                      <span className="inline-flex items-center gap-1"><CircleDollarSign size={14} /> {money(credit.balance)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button type="button" onClick={() => setDetailId(credit.id)} className="rounded p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Ver crédito"><Eye size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">Página {pagination.page} de {pagination.totalPages}</p>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={!pagination.hasPrev || loading} onClick={() => setPage(value => value - 1)}><ChevronLeft size={14} /></Button>
              <Button size="sm" variant="outline" disabled={!pagination.hasNext || loading} onClick={() => setPage(value => value + 1)}><ChevronRight size={14} /></Button>
            </div>
          </div>
        )}
      </div>

      <CreateCreditModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={credit => {
          setCreateOpen(false);
          setStatus('open');
          setSearch('');
          setPage(1);
          setReloadKey(value => value + 1);
          setDetailId(credit.id);
        }}
      />
      {detailId && (
        <CreditDetailModal
          creditId={detailId}
          canManage={canManage}
          onClose={() => { setDetailId(null); setReloadKey(value => value + 1); }}
          onChanged={handleCreditChanged}
        />
      )}
    </div>
  );
};

export default CreditsPage;

