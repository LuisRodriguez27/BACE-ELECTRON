import { Button } from '@/components/ui/button';
import { DollarSign, Edit3, Hash, Package, Plus, Search, Trash2, Printer, Layers } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CreateProductModal, DeleteProductModal, EditProductModal, ProductDetailView, SimilarNamesModal } from './components';
import { ProductsApiService } from './ProductsApiService';
import type { Product } from './types';
import type { ProductTemplate } from '@/features/productTemplates/types';
import { usePermissions } from '@/hooks/use-permissions';

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<(Product & { templates?: ProductTemplate[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Estados para vista detallada
  const [currentView, setCurrentView] = useState<'list' | 'detail'>('list');
  const [detailProductId, setDetailProductId] = useState<number | null>(null);
  
  const [showSimilarModal, setShowSimilarModal] = useState(false);

  const { checkPermission } = usePermissions();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await ProductsApiService.findAllWithTemplates();
        setProducts(data);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Error al cargar productos');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Validar que los datos sean válidos y filtrar
  const filteredProducts = products.filter(product => {
    // Validación defensiva: asegurar que el product sea válido
    if (!product || typeof product !== 'object' || !product.id || !product.name) {
      console.warn('Producto inválido encontrado en la lista:', product);
      return false;
    }
    
    const searchLower = searchTerm.toLowerCase();
    
    return (
      product.name.toLowerCase().includes(searchLower) ||
      (product.serial_number && product.serial_number.toLowerCase().includes(searchLower)) ||
      (product.id && product.id.toString().includes(searchLower))
    );
  });
  
  const handleProductCreated = (newProduct: Product) => {
    // Prepend the new product so it shows at the top of the list immediately
    setProducts(prevProducts => [newProduct, ...prevProducts]);
    toast.success('Producto creado exitosamente');
  };

  const handleProductUpdated = (updatedProduct: Product) => {
    if (!updatedProduct || !updatedProduct.id) {
      console.error('Producto actualizado no válido:', updatedProduct);
      toast.error('Error: datos del producto inválidos');
      return;
    }
    
    setProducts(prevProducts =>
      prevProducts.map(product =>
        product && product.id === updatedProduct.id 
          ? { ...updatedProduct, templates: product.templates } 
          : product
      )
    );
    toast.success(`Producto ${updatedProduct.name} actualizado exitosamente`);
  };

  const handleProductDeleted = (deletedProductId: number) => {
    const deletedProduct = products.find(p => p.id === deletedProductId);
    setProducts(prevProducts =>
      prevProducts.filter(product => product.id !== deletedProductId)
    );
    toast.success(`Producto ${deletedProduct?.name} eliminado exitosamente`);
  };

  const openCreateModal = () => {
    if (!checkPermission("Crear Producto")) {
      return;
    }
    setShowCreateModal(true);
  };

  const openEditModal = (product: Product) => {
    if (!checkPermission("Editar Producto")) {
      return;
    }
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const openDeleteModal = (product: Product) => {
    if (!checkPermission("Eliminar Producto")) {
      return;
    }
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const openProductDetail = (productId: number) => {
    setDetailProductId(productId);
    setCurrentView('detail');
  };

  const closeProductDetail = () => {
    setCurrentView('list');
    setDetailProductId(null);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedProduct(null);
  };

  const handlePrintInventory = async () => {
    try {
      const toastId = toast.loading('Preparando documento de impresión...');

      // Obtener todos los productos con sus plantillas (subproductos)
      const productsWithTemplates = await ProductsApiService.findAllWithTemplates();

      // Filtrar si hay búsqueda activa (opcional, pero consistente con la UI)
      // Si el usuario quiere imprimir TODO el inventario siempre, quitamos este filtro.
      // Asumiremos que quiere imprimir lo que ve o todo? El prompt dice "imprimir todos los productos que tengo en la app".
      // Usaremos productsWithTemplates completo.

      // Generar HTML
      const printHTML = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Inventario de Productos</title>
          <style>
            @page {
              size: letter;
              margin: 1.5cm;
            }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
              color: #1f2937;
              max-width: 100%;
            }
            h1 {
              text-align: center;
              font-size: 20px;
              margin-bottom: 5px;
              text-transform: uppercase;
              color: #111827;
            }
            .subtitle {
              text-align: center;
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 25px;
            }
            .date {
              text-align: right;
              font-size: 10px;
              margin-bottom: 10px;
              color: #6b7280;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              background-color: #f3f4f6;
              border-bottom: 2px solid #e5e7eb;
              padding: 10px 8px;
              text-align: left;
              font-weight: 700;
              color: #374151;
              text-transform: uppercase;
              font-size: 11px;
            }
            td {
              border-bottom: 1px solid #e5e7eb;
              padding: 8px;
              vertical-align: top;
            }
            tr {
              page-break-inside: avoid;
            }
            .product-row td {
              font-weight: 600;
              background-color: #f9fafb;
              color: #111827;
            }
            .template-row td {
              color: #4b5563;
              font-size: 11px;
            }
            .sub-indicator {
              display: inline-block;
              width: 20px;
              text-align: right;
              margin-right: 5px;
              color: #9ca3af;
            }
            .price-col {
              text-align: right;
              width: 100px;
              font-family: 'Courier New', monospace;
            }
            .serial-col {
              width: 120px;
              font-family: 'Courier New', monospace;
            }
            .empty-templates {
              font-style: italic;
              color: #9ca3af;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <div class="date">Generado el: ${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} a las ${new Date().toLocaleTimeString('es-MX')}</div>
          <h1>Inventario General</h1>
          <div class="subtitle">BACE - LISTA DE PRODUCTOS Y SUBPRODUCTOS</div>
          
          <table>
            <thead>
              <tr>
                <th>Producto / Variantes</th>
                <th class="serial-col">Código</th>
                <th class="price-col">Precio</th>
              </tr>
            </thead>
            <tbody>
              ${productsWithTemplates.map(p => {
        const productRow = `
                  <tr class="product-row">
                    <td>${p.name}</td>
                    <td class="serial-col">${p.serial_number || '-'}</td>
                    <td class="price-col">$${p.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `;

        let templateRows = '';
        if (p.templates && p.templates.length > 0) {
          templateRows = p.templates.map(t => {
            // Construir descripción
            let descParts = [];
            if (t.colors) descParts.push(t.colors);
            if (t.width && t.height) descParts.push(`${t.width}x${t.height}`);
            if (t.position) descParts.push(t.position);

            const variantName = t.description ? `${t.description}` : '';
            const extraDesc = `<br><span style="color:#9ca3af; font-size:10px;">${descParts.join(' - ') || 'Variante'}</span>`;

            const price = t.final_price !== undefined && t.final_price !== null
              ? t.final_price
              : p.price;

            return `
                      <tr class="template-row">
                        <td style="padding-left: 20px;">
                          <span class="sub-indicator">↳</span> 
                          ${variantName} ${t.texts ? `"${t.texts}"` : ''} 
                          ${extraDesc}
                        </td>
                        <td class="serial-col" style="font-size:10px;">${t.id}</td>
                        <td class="price-col">$${price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                      </tr>
                     `;
          }).join('');
        } else {
          // Opcional: mostrar mensaje si no tiene variantes? No, mejor limpiar para ahorrar tinta.
        }

        return productRow + templateRows;
      }).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank', 'width=1000,height=800');
      if (printWindow) {
        printWindow.document.write(printHTML);
        printWindow.document.close();
        printWindow.onload = () => {
          // Pequeño timeout para asegurar que estilos carguen si hubiera externos (aquí no hay)
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            // printWindow.close(); // Opcional, algunos navegadores bloquean el cierre inmediato
          }, 500);
        };
      } else {
        toast.error("No se pudo abrir la ventana de impresión. Verifique los bloqueadores de ventanas emergentes.");
      }

      toast.dismiss(toastId);
    } catch (err) {
      console.error(err);
      toast.error('Error al generar reporte de inventario');
    }
  };

  // Si estamos en vista detallada, mostrar el componente correspondiente
  if (currentView === 'detail' && detailProductId) {
    return (
      <ProductDetailView
        productId={detailProductId}
        onBack={closeProductDetail}
        onProductUpdated={handleProductUpdated}
      />
    );
  }

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
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Productos</h1>
          <p className="text-gray-600 mt-2">
            Administra tu catálogo de productos personalizados
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handlePrintInventory}
          >
            <Printer size={16} />
            Imprimir Inventario
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setShowSimilarModal(true)}
          >
            <Layers size={16} />
            Buscar Similares
          </Button>
          <Button
            className="flex items-center gap-2"
            onClick={openCreateModal}
          >
            <Plus size={16} />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de productos */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Productos ({filteredProducts.length})
          </h2>
        </div>
        <div className="p-6">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos</h3>
              <p className="text-gray-500 mb-4">
                Comienza agregando tu primer producto al catálogo
              </p>
              <Button 
                className="flex items-center gap-2 mx-auto"
                onClick={openCreateModal}
              >
                <Plus size={16} />
                Agregar Primer Producto
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {filteredProducts.map((product) => (
                <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex flex-col overflow-hidden mr-2">
                      <h3 className="font-semibold text-gray-900 truncate" title={product.name}>
                        <span className="text-gray-500 font-normal mr-2">#{product.id}</span>
                        {product.name}
                      </h3>
                      <span className="inline-flex items-center text-xs text-gray-500 mt-1">
                        <Layers size={12} className="mr-1" />
                        {product.templates?.length || 0} {(product.templates?.length || 0) === 1 ? 'plantilla' : 'plantillas'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button 
                        variant="ghost"  
                        size="sm"
                        onClick={() => openEditModal(product)}
                        className='p-1 h-8 w-8'
                      >
                        <Edit3 size={14} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openDeleteModal(product)}
                        className="p-1 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    {product.serial_number && (
                      <div className="flex items-center gap-2">
                        <Hash size={14} />
                        <span className="font-mono text-xs">{product.serial_number}</span>
                      </div>
                    )}

                    {(() => {
                      let activePrice = product.price;
                      let isPromo = false;
                      let isDiscount = false;

                      if (product.promo_price !== null && product.promo_price !== undefined && product.promo_price < product.price) {
                        activePrice = product.promo_price;
                        isPromo = true;
                      }

                      if (product.discount_price !== null && product.discount_price !== undefined && product.discount_price < activePrice) {
                        activePrice = product.discount_price;
                        isPromo = false;
                        isDiscount = true;
                      }

                      if (isPromo || isDiscount) {
                        return (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <DollarSign size={12} className="text-gray-400" />
                              <span className="text-gray-400 line-through text-xs">
                                ${product.price.toFixed(2)} MXN
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
                          <DollarSign size={14} />
                          <span className="font-semibold text-green-600">
                            ${product.price.toFixed(2)} MXN
                          </span>
                        </div>
                      );
                    })()}

                    {product.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mt-2">
                        {product.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      product.active === 1 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.active === 1 ? 'Activo' : 'Inactivo'}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openProductDetail(product.id)}
                    >
                      Ver Detalles
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateProductModal
        isOpen={showCreateModal}
        onClose={closeModals}
        onProductCreated={handleProductCreated}
      />
      
      <EditProductModal
        isOpen={showEditModal}
        onClose={closeModals}
        onProductUpdated={handleProductUpdated}
        product={selectedProduct}
      />
      
      <DeleteProductModal
        isOpen={showDeleteModal}
        onClose={closeModals}
        onProductDeleted={handleProductDeleted}
        product={selectedProduct}
      />
      
      <SimilarNamesModal
        isOpen={showSimilarModal}
        onClose={() => setShowSimilarModal(false)}
      />
      
    </div>
  );
};

export default ProductsPage;
