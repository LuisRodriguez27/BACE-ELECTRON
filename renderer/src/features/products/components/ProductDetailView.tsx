import { Button, Input } from '@/components/ui';
import { ProductTemplatesApiService } from '@/features/productTemplates/ProductTemplatesApiService';
import type { ProductTemplate } from '@/features/productTemplates/types';
import {
  ArrowLeft,
  BarChart3,
  DollarSign,
  Edit3,
  FileText,
  Grid,
  Hash,
  List,
  MapPin,
  Package,
  Palette,
  Plus,
  Ruler,
  Search,
  Trash2,
  User
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ProductsApiService } from '../ProductsApiService';
import type { Product } from '../types';

interface ProductDetailViewProps {
  productId: number;
  onBack: () => void;
  onEditProduct: (product: Product) => void;
  onCreateTemplate: (productId: number) => void;
  onEditTemplate: (template: ProductTemplate) => void;
}

const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  productId, onBack, onEditProduct, onCreateTemplate, onEditTemplate
}) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setTemplatesLoading(true);
        
        const [productData, templatesData] = await Promise.all([
          ProductsApiService.findById(productId),
          ProductTemplatesApiService.findByProductId(productId)
        ]);
        
        setProduct(productData);
        setTemplates(templatesData);
      } catch (err) {
        console.error('Error fetching product data:', err);
        setError('Error al cargar los datos del producto');
        toast.error('Error al cargar los datos del producto');
      } finally {
        setLoading(false);
        setTemplatesLoading(false);
      }
    };

    if (productId) {
      fetchData();
    }
  }, [productId]);

  const filteredTemplates = templates.filter(template =>
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('¿Estás seguro de eliminar esta plantilla? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await ProductTemplatesApiService.delete(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success('Plantilla eliminada exitosamente');
      
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Error al eliminar la plantilla');
    }
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-6">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Volver
        </Button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Producto no encontrado'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Volver
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-gray-600">Gestión de producto y plantillas</p>
        </div>
        <Button 
          onClick={() => onEditProduct(product)}
          className="flex items-center gap-2"
        >
          <Edit3 size={16} />
          Editar Producto
        </Button>
      </div>

      {/* Product Info Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información del Producto</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Package className="text-gray-400" size={16} />
                <span className="font-medium">{product.name}</span>
              </div>
              
              {product.serial_number && (
                <div className="flex items-center gap-3">
                  <Hash className="text-gray-400" size={16} />
                  <span className="font-mono text-sm">{product.serial_number}</span>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <DollarSign className="text-gray-400" size={16} />
                <span className="font-semibold text-green-600">
                  ${product.price.toFixed(2)} MXN
                </span>
              </div>
              
              {product.description && (
                <div className="flex items-start gap-3">
                  <FileText className="text-gray-400 mt-0.5" size={16} />
                  <span className="text-sm text-gray-600">{product.description}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Estadísticas</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-gray-400" size={14} />
                <span>{templates.length} plantillas</span>
              </div>
                            
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  product.active === 1 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {product.active === 1 ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Section */}
      <div className="bg-white rounded-lg shadow">
        {/* Templates Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Plantillas ({filteredTemplates.length})
              </h2>
              <p className="text-sm text-gray-600">
                Configuraciones personalizadas para este producto
              </p>
            </div>
            <Button 
              onClick={() => onCreateTemplate(productId)}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Nueva Plantilla
            </Button>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  type="text"
                  placeholder="Buscar plantillas..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
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

        {/* Templates Content */}
        <div className="p-6">
          {templatesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-48 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No se encontraron plantillas' : 'No hay plantillas'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? 'Intenta con otros términos de búsqueda'
                  : 'Crea la primera plantilla para este producto'
                }
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => onCreateTemplate(productId)}
                  className="flex items-center gap-2 mx-auto"
                >
                  <Plus size={16} />
                  Crear Primera Plantilla
                </Button>
              )}
            </div>
          ) : (
            <div className={`grid gap-4 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {filteredTemplates.map((template) => {
                const colors = formatColors(template.colors);
                
                return (
                  <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">
                          {template.description}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {template.created_by_username && (
                            <div className="flex items-center gap-1">
                              <User size={12} />
                              <span>{template.created_by_username}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                    </div>

                    {/* Template Specifications */}
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
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

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onEditTemplate(template)}
                        className="flex-1 flex items-center gap-1"
                      >
                        <Edit3 size={14} />
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailView;