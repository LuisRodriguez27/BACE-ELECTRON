import { Button, Input } from '@/components/ui';
import { ProductsApiService } from '@/features/products/ProductsApiService';
import type { Product } from '@/features/products/types';
import {
  DollarSign,
  Grid, List,
  MapPin,
  Package,
  Palette, Ruler,
  Search,
  Trash2,
  User,
  FileText,
  Loader2
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ProductTemplatesApiService } from './ProductTemplatesApiService';
import type { ProductTemplate } from './types';
import { usePermissions } from '@/hooks/use-permissions';
import DeleteTemplateModal from './components/DeleteTemplateModal';

const ProductTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { checkPermission } = usePermissions();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ProductTemplate | null>(null);

  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastTemplateElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && pagination.hasNext) {
        loadMoreTemplates();
      }
    });
    if (node) observerRef.current.observe(node);
  }, [loadingMore, pagination.hasNext]);

  // Update debounced search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300); // 300ms debounce

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const loadTemplates = async (page: number = 1, reset: boolean = true, searchQuery: string = '') => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await ProductTemplatesApiService.findPaginated(page, 12, searchQuery);

      if (reset) {
        setTemplates(response.data);
      } else {
        setTemplates(prev => [...prev, ...response.data]);
      }

      setPagination(response.pagination);
      setCurrentSearchTerm(searchQuery);
      setError(null);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Error al cargar las plantillas');
      toast.error('Error al cargar las plantillas');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreTemplates = () => {
    if (!loadingMore && pagination.hasNext) {
      loadTemplates(pagination.page + 1, false, currentSearchTerm);
    }
  };

  // Carga inicial
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const productsData = await ProductsApiService.findAll();
        setProducts(productsData);
      } catch (err) {
        console.error('Error loading products for dropdown:', err);
      }
      loadTemplates(1, true, '');
    };
    loadInitialData();
  }, []);

  // Fetch templates when debounced search term changes
  useEffect(() => {
    if (debouncedSearch !== currentSearchTerm) {
      loadTemplates(1, true, debouncedSearch);
    }
  }, [debouncedSearch]);

  const filteredTemplates = templates.filter(template => {
    const matchesProduct = selectedProduct === 'all' || template.product_id.toString() === selectedProduct;
    const matchesUser = selectedUser === 'all' || template.created_by_username === selectedUser;

    return matchesProduct && matchesUser;
  });

  const openDeleteModal = (template: ProductTemplate) => {
    // Validar permiso antes de proceder
    if (!checkPermission("Eliminar Plantilla")) {
      return;
    }
    setTemplateToDelete(template);
    setDeleteModalOpen(true);
  };

  const handleTemplateDeleted = (templateId: number) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    setPagination(prev => ({
      ...prev,
      total: Math.max(0, prev.total - 1)
    }));
    toast.success('Plantilla eliminada exitosamente');
  };

  const formatColors = (colors?: string) => {
    if (!colors) return null;
    try {
      const colorArray = JSON.parse(colors);
      return Array.isArray(colorArray) ? colorArray : [colors];
    } catch {
      return [colors];
    }
  };

  const getUniqueUsers = () => {
    const users = templates.map(t => t.created_by_username).filter(Boolean);
    return [...new Set(users)];
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <Button
            onClick={() => loadTemplates(1, true, currentSearchTerm)}
            className="mt-2"
            size="sm"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plantillas de Productos</h1>
          <p className="text-gray-600 mt-2">
            Gestiona las plantillas de productos para reutilizar configuraciones personalizadas
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Plantillas</p>
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
            </div>
          </div>
        </div>


      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                type="text"
                placeholder="Buscar plantillas por descripción o producto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={selectedProduct}
              onChange={e => setSelectedProduct(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los productos</option>
              {products.map(product => (
                <option key={product.id} value={product.id.toString()}>
                  {product.name}
                </option>
              ))}
            </select>

            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los usuarios</option>
              {getUniqueUsers().map(user => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="p-2"
              >
                <Grid size={16} />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="p-2"
              >
                <List size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Grid/List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Plantillas ({pagination.total})
          </h2>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="animate-pulse grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {currentSearchTerm || selectedProduct !== 'all' || selectedUser !== 'all'
                  ? 'No se encontraron plantillas'
                  : 'No hay plantillas'
                }
              </h3>
              <p className="text-gray-500 mb-4">
                {currentSearchTerm || selectedProduct !== 'all' || selectedUser !== 'all'
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Las plantillas se crearán desde la vista de productos individuales'
                }
              </p>
            </div>
          ) : (
            <>
              <div className={`grid gap-4 ${viewMode === 'grid'
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1'
                }`}>
                {filteredTemplates.map((template, index) => {
                  const colors = formatColors(template.colors);

                  return (
                    <div
                      key={template.id}
                      ref={index === filteredTemplates.length - 1 ? lastTemplateElementRef : null}
                      className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${viewMode === 'list' ? 'flex items-center gap-4' : ''
                        }`}
                    >
                      <div className={`${viewMode === 'list' ? 'flex-1' : ''}`}>
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 mb-1">
                              {template.description}
                            </h3>
                            <p className="text-sm font-medium text-blue-600 mb-1">
                              {template.product_name}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              {template.created_by_username && (
                                <div className="flex items-center gap-1">
                                  <User size={12} />
                                  <span>{template.created_by_username}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Specifications */}
                        <div className={`${viewMode === 'list' ? 'flex items-center gap-6' : 'space-y-2'} text-sm text-gray-600 mb-4`}>
                          {(() => {
                            let activePrice = template.final_price;
                            let isPromo = false;
                            let isDiscount = false;

                            if (template.promo_price !== null && template.promo_price !== undefined && template.promo_price < template.final_price) {
                              activePrice = template.promo_price;
                              isPromo = true;
                            }

                            if (template.discount_price !== null && template.discount_price !== undefined && template.discount_price < activePrice) {
                              activePrice = template.discount_price;
                              isPromo = false;
                              isDiscount = true;
                            }

                            if (isPromo || isDiscount) {
                              return (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <DollarSign size={12} className="text-gray-400" />
                                    <span className="text-gray-400 line-through text-xs">
                                      ${template.final_price.toFixed(2)} MXN
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <DollarSign size={14} className={isPromo ? "text-blue-600" : "text-orange-600"} />
                                    <span className={`font-semibold ${isPromo ? "text-blue-600" : "text-orange-600"}`}>
                                      ${activePrice.toFixed(2)} MXN
                                    </span>
                                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${isPromo ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}`}>
                                      {isPromo ? 'Promo' : 'Desc'}
                                    </span>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className="flex items-center gap-2">
                                <DollarSign size={14} className="text-green-600" />
                                <span className="font-semibold text-green-600">
                                  ${template.final_price.toFixed(2)} MXN
                                </span>
                              </div>
                            );
                          })()}

                          {(template.width || template.height) && (
                            <div className="flex items-center gap-2">
                              <Ruler size={14} />
                              <span>
                                {template.width && template.height
                                  ? `${template.width}m × ${template.height}m`
                                  : template.width
                                    ? `Ancho: ${template.width}m`
                                    : `Alto: ${template.height}m`
                                }
                              </span>
                            </div>
                          )}

                          {template.position && (
                            <div className="flex items-center gap-2">
                              <MapPin size={14} />
                              <span className="capitalize">{template.position}</span>
                            </div>
                          )}

                          {template.texts && (
                            <div className="flex items-start gap-2 max-w-full">
                              <FileText size={14} className="shrink-0 mt-0.5" />
                              <span className="text-sm truncate" title={template.texts}>
                                {template.texts}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Colors */}
                        {colors && colors.length > 0 && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Palette size={14} className="text-gray-400" />
                              <span className="text-xs text-gray-500">Colores:</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {colors.map((color, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                                >
                                  {color}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className={`${viewMode === 'list' ? 'flex items-center' : 'flex items-center justify-between pt-3 border-t border-gray-100'} gap-2`}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteModal(template)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Loading indicator para scroll infinito */}
              {loadingMore && (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Cargando más plantillas...</span>
                </div>
              )}

              {/* Mensaje cuando se han cargado todas las plantillas */}
              {!loadingMore && !pagination.hasNext && filteredTemplates.length > 0 && (
                <div className="text-center py-8 border-t border-gray-100 mt-6">
                  <p className="text-gray-500">
                    {currentSearchTerm
                      ? `Se encontraron ${pagination.total} resultado${pagination.total !== 1 ? 's' : ''} para "${currentSearchTerm}"`
                      : `Has visto todas las plantillas (${pagination.total})`
                    }
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      <DeleteTemplateModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onTemplateDeleted={handleTemplateDeleted}
        template={templateToDelete}
      />
    </div>
  );
};

export default ProductTemplatesPage;
