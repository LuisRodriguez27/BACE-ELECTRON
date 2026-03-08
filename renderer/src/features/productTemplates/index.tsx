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
  FileText
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ProductTemplatesApiService } from './ProductTemplatesApiService';
import type { ProductTemplate } from './types';
import { usePermissions } from '@/hooks/use-permissions';
import DeleteTemplateModal from './components/DeleteTemplateModal';

const ProductTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { checkPermission } = usePermissions();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ProductTemplate | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [templatesData, productsData] = await Promise.all([
          ProductTemplatesApiService.findAll(),
          ProductsApiService.findAll(),
        ]);

        setTemplates(templatesData);
        setProducts(productsData);
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError('Error al cargar las plantillas');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProduct = selectedProduct === 'all' || template.product_id.toString() === selectedProduct;
    const matchesUser = selectedUser === 'all' || template.created_by_username === selectedUser;

    return matchesSearch && matchesProduct && matchesUser;
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <Button
            onClick={() => window.location.reload()}
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
              <p className="text-2xl font-bold text-gray-900">{templates.length}</p>
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
            Plantillas ({filteredTemplates.length})
          </h2>
        </div>

        <div className="p-6">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedProduct !== 'all' || selectedUser !== 'all'
                  ? 'No se encontraron plantillas'
                  : 'No hay plantillas'
                }
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedProduct !== 'all' || selectedUser !== 'all'
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Las plantillas se crearán desde la vista de productos individuales'
                }
              </p>
            </div>
          ) : (
            <div className={`grid gap-4 ${viewMode === 'grid'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1'
              }`}>
              {filteredTemplates.map((template) => {
                const colors = formatColors(template.colors);

                return (
                  <div
                    key={template.id}
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
