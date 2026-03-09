import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductsApiService } from '../ProductsApiService';
import type { SimilarNameResult } from '../types';

interface SimilarNamesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SimilarNamesModal: React.FC<SimilarNamesModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<SimilarNameResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const res = await ProductsApiService.findSimilarNames();
          setData(res);
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else {
      setData([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Palabras similares en Productos</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X size={16} />
          </Button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <p className="text-gray-500">Buscando similitudes...</p>
          ) : data.length === 0 ? (
            <p className="text-gray-500">No se encontraron palabras comunes.</p>
          ) : (
            <div className="space-y-4">
              {data.map((item, index) => (
                <div key={index} className="border p-4 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg text-blue-600 capitalize">"{item.word}"</h3>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold">
                      {item.count} productos
                    </span>
                  </div>
                  <ul className="list-disc pl-5 mt-3 space-y-2 text-sm text-gray-700">
                    {item.products.map(p => (
                      <li key={p.id}>
                        <span className="inline-block bg-gray-200 text-gray-700 rounded px-1.5 py-0.5 text-xs font-mono mr-2">
                          #{p.id}
                        </span>
                        <span className="font-medium text-gray-900">{p.name}</span>
                        {p.serial_number && (
                          <span className="text-gray-500 ml-2 text-xs">
                            (NS: {p.serial_number})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
