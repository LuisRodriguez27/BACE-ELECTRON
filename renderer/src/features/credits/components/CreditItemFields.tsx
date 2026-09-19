import React, { useEffect, useState } from 'react';
import { Loader2, Search, ShoppingCart, Zap } from 'lucide-react';
import { CreditApiService } from '../CreditApiService';
import type { CreditItemForm, CreditSourceSearchResult, CreditSourceType } from '../types';
import { formatDateMX, isoToDatetimeLocalMX } from '@/utils/dateUtils';

interface Props {
  value: CreditItemForm;
  onChange: (value: CreditItemForm) => void;
  sourceLocked?: boolean;
}

const sourceLabel = (type: CreditSourceType) => {
  if (type === 'order') return 'Orden normal';
  if (type === 'simple_order') return 'Orden rápida';
  return 'Cargo manual';
};

const CreditItemFields: React.FC<Props> = ({ value, onChange, sourceLocked = false }) => {
  const [search, setSearch] = useState('');
  const [sources, setSources] = useState<CreditSourceSearchResult[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);

  useEffect(() => {
    const sourceType = value.source_type;
    if (sourceLocked || sourceType === 'manual') {
      setSources([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingSources(true);
      setSourceError(null);
      try {
        const result = await CreditApiService.searchSources(search.trim(), 20, sourceType);
        if (!cancelled) setSources(result);
      } catch {
        if (!cancelled) setSourceError('No se pudieron consultar las órdenes disponibles');
      } finally {
        if (!cancelled) setLoadingSources(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, sourceLocked, value.source_type]);

  const updateNumber = (field: 'quantity' | 'unit_price', raw: string) => {
    const parsed = Number(raw);
    const next = { ...value, [field]: Number.isFinite(parsed) ? parsed : 0 };
    next.total = Math.round(next.quantity * next.unit_price * 100) / 100;
    onChange(next);
  };

  const changeSourceType = (sourceType: CreditSourceType) => {
    setSearch('');
    onChange({
      ...value,
      source_type: sourceType,
      source_id: undefined,
      product: '',
      quantity: 1,
      unit_price: 0,
      total: 0,
    });
  };

  const selectSource = (source: CreditSourceSearchResult) => {
    onChange({
      ...value,
      source_type: source.source_type,
      source_id: source.id,
      date: isoToDatetimeLocalMX(source.date),
      product: source.product,
      quantity: 1,
      unit_price: source.available,
      total: source.available,
    });
    setSearch(`#${source.id} · ${source.product}`);
    setSources([]);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Origen del cargo</label>
        {sourceLocked ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            {sourceLabel(value.source_type)}
            {value.source_id ? ` #${value.source_id}` : ''}. El origen queda fijo para conservar la relación correcta.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {(['manual', 'order', 'simple_order'] as CreditSourceType[]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => changeSourceType(type)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  value.source_type === type
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {sourceLabel(type)}
              </button>
            ))}
          </div>
        )}
      </div>

      {!sourceLocked && value.source_type !== 'manual' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Buscar {value.source_type === 'order' ? 'orden' : 'orden rápida'} disponible *
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={16} />
            <input
              value={search}
              onChange={event => {
                setSearch(event.target.value);
                if (value.source_id) {
                  onChange({ ...value, source_id: undefined, product: '', quantity: 1, unit_price: 0, total: 0 });
                }
              }}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-10 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar por ID, producto, cliente o teléfono..."
            />
            {loadingSources && <Loader2 className="absolute right-3 top-3 animate-spin text-gray-400" size={16} />}
          </div>
          {sourceError && <p className="mt-1 text-xs text-red-600">{sourceError}</p>}
          {!loadingSources && sources.length > 0 && !value.source_id && (
            <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
              {sources.map(source => (
                <button
                  key={`${source.source_type}-${source.id}`}
                  type="button"
                  onClick={() => selectSource(source)}
                  className="flex w-full items-start gap-3 border-b border-gray-100 px-3 py-3 text-left last:border-b-0 hover:bg-blue-50"
                >
                  {source.source_type === 'order'
                    ? <ShoppingCart className="mt-0.5 shrink-0 text-blue-600" size={17} />
                    : <Zap className="mt-0.5 shrink-0 text-amber-500" size={17} />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900">
                      #{source.id} · {source.product}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {source.client_name || 'Sin cliente'} · {formatDateMX(source.date, 'DD/MM/YYYY')}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-green-700">${source.available.toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
          {!loadingSources && sources.length === 0 && !value.source_id && (
            <p className="mt-2 text-xs text-gray-500">No hay órdenes de este tipo con saldo disponible.</p>
          )}
          {value.source_id && (
            <div className="mt-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              {sourceLabel(value.source_type)} #{value.source_id} seleccionada. El producto puede ajustarse sin cambiar la relación.
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del trabajo *</label>
        <input
          type="datetime-local"
          value={value.date}
          onChange={event => onChange({ ...value, date: event.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Producto / concepto *</label>
        <textarea
          value={value.product}
          onChange={event => onChange({ ...value, product: event.target.value })}
          rows={3}
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Describe lo que pidió el cliente..."
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
          <input
            type="number"
            min="0.0001"
            step="0.0001"
            value={value.quantity || ''}
            onChange={event => updateNumber('quantity', event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Costo unitario *</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={value.unit_price || ''}
            onChange={event => updateNumber('unit_price', event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-semibold text-gray-900">
            ${value.total.toFixed(2)}
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500">Para capturar sólo un total, conserva cantidad 1 y escribe el total como costo unitario.</p>
    </div>
  );
};

export default CreditItemFields;
