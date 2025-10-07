import { Button, Input, Label } from '@/components/ui';
import type { Client } from '@/features/clients/types';
import CreateClientModal from '@/features/clients/components/CreateClientModal';
import CreateTemplateModal from '@/features/products/components/CreateTemplateModal';
import QuickCreateProductModal from '@/features/products/components/QuickCreateProductModal';
import type { Product } from '@/features/products/types';
import { ProductTemplatesApiService } from '@/features/productTemplates/ProductTemplatesApiService';
import type { ProductTemplate } from '@/features/productTemplates/types';
import { extractErrorMessage } from '@/utils/errorHandling';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, DollarSign, Layers, Loader, Package, Plus, ReceiptText, Search, ShoppingBag, Trash2, X, User } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { calculateBudgetTotal, type CreateBudgetForm, createBudgetItemFromFormItem, createBudgetSchema, type Budget, type BudgetFormItem } from "../types";
import { toast } from 'sonner';
import BudgetPrintPreviewModal from './BudgetPrintPreviewModal';
import { BudgetApiService } from '../BudgetApiService';
interface CreateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBudgetCreated: (budget: Budget) => void;
  currentUserId: number;
}

export const CreateBudgetModal: React.FC<CreateBudgetModalProps> = ({
  isOpen,
  onClose,
  onBudgetCreated,
  currentUserId
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [selectedProductForTemplate, setSelectedProductForTemplate] = useState<Product | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  
  // Estado de los items de la orden (productos y plantillas)
  const [budgetItems, setBudgetItems] = useState<BudgetFormItem[]>([]);
  const [searchTerms, setSearchTerms] = useState<{[key: number]: string}>({});
  const [showDropdowns, setShowDropdowns] = useState<{[key: number]: boolean}>({});
  const [dropdownPositions, setDropdownPositions] = useState<{[key: number]: {top: number, left: number, width: number, maxHeight?: number}}>({});
  const [selectedCategory, setSelectedCategory] = useState<{[key: number]: 'all' | 'products' | 'templates'}>({});
  const [nextBudgetId, setNextBudgetId] = useState<number>(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CreateBudgetForm>({
    resolver: zodResolver(createBudgetSchema),
    defaultValues: {
      user_id: currentUserId,
      date: new Date().toISOString().split('T')[0],
      items: []
    }
  });

  // Actualizar el formulario cuando cambien los items
  useEffect(() => {
    const items = budgetItems.map(createBudgetItemFromFormItem);
    setValue('items', items);
  }, [budgetItems, setValue]);

  // Efecto para cargar el próximo ID del presupuesto
  useEffect(() => {
    if (isOpen) {
      const loadNextId = async () => {
        try {
          const nextId = await BudgetApiService.getNextId();
          setNextBudgetId(nextId);
        } catch (error) {
          console.error('Error al obtener próximo ID:', error);
          setNextBudgetId(0);
        }
      };
      
      loadNextId();
    }
  }, [isOpen]);

  // Función para calcular posición del dropdown
  const updateDropdownPosition = (index: number) => {
    const inputElement = document.getElementById(`item-input-${index}`);
    if (inputElement) {
      const rect = inputElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Ajustar posición horizontal para no salirse de la pantalla
      let left = rect.left + window.scrollX;
      if (rect.right > viewportWidth - 20) {
        left = viewportWidth - rect.width - 20 + window.scrollX;
      }
      
      // Calcular altura máxima disponible hacia abajo
      const spaceBelow = viewportHeight - rect.bottom - 20;
      const maxHeight = Math.max(150, Math.min(300, spaceBelow));
      
      setDropdownPositions(prev => ({
        ...prev,
        [index]: {
          top: rect.bottom + window.scrollY,
          left: left,
          width: rect.width,
          maxHeight: maxHeight
        }
      }));
    }
  };

  // Función mejorada para mostrar dropdown
  const showDropdown = (index: number) => {
    updateDropdownPosition(index);
    setShowDropdowns(prev => ({ ...prev, [index]: true }));
  };

  // Calcular total automáticamente
  const total = calculateBudgetTotal(budgetItems);

  // Cargar datos al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadClients();
      loadProducts();
      loadTemplates();
    }
  }, [isOpen]);

  // Efecto para sincronizar el cliente seleccionado con el estado de búsqueda
  useEffect(() => {
    if (selectedClientId && clients.length > 0) {
      const selectedClient = clients.find(c => c.id === selectedClientId);
      if (selectedClient && !clientSearchTerm) {
        setClientSearchTerm(`${selectedClient.name} - ${selectedClient.phone}`);
      }
    }
  }, [selectedClientId, clients, clientSearchTerm]);



  // Recalcular posiciones cuando cambie el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      Object.keys(showDropdowns).forEach(key => {
        if (showDropdowns[parseInt(key)]) {
          updateDropdownPosition(parseInt(key));
        }
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [showDropdowns]);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Manejar dropdowns de items de productos/plantillas
      budgetItems.forEach((_, index) => {
        const dropdown = document.getElementById(`item-dropdown-${index}`);
        const inputElement = document.getElementById(`item-input-${index}`);
        
        if (dropdown && showDropdowns[index]) {
          const isClickInsideDropdown = dropdown.contains(target);
          const isClickInsideInput = inputElement?.contains(target);
          
          if (!isClickInsideDropdown && !isClickInsideInput) {
            setShowDropdowns(prev => ({ ...prev, [index]: false }));
          }
        }
      });
      
      // Manejar dropdown de clientes
      const clientDropdown = document.getElementById('client-dropdown');
      const clientInput = document.getElementById('client-search-input');
      
      if (clientDropdown && showClientDropdown) {
        const isClickInsideClientDropdown = clientDropdown.contains(target);
        const isClickInsideClientInput = clientInput?.contains(target);
        
        if (!isClickInsideClientDropdown && !isClickInsideClientInput) {
          setShowClientDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [budgetItems, showDropdowns, showClientDropdown]);

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const response = await window.api.getAllClients();
      setClients(response);
    } catch (err) {
      console.error('Error loading clients:', err);
      setError('Error al cargar los clientes');
    } finally {
      setLoadingClients(false);
    }
  };



  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await window.api.getAllProducts();
      setProducts(response.filter(p => p.active === 1));
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Error al cargar los productos');
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await ProductTemplatesApiService.findAll();
      setTemplates(response.filter((t: ProductTemplate) => t.active === 1));
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Error al cargar las plantillas');
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Agregar nuevo item vacío
  const addBudgetItem = () => {
    const newItem: BudgetFormItem = {
      type: 'product',
      id: 0,
      name: '',
      quantity: 1,
      unit_price: 0
    };
    const newIndex = budgetItems.length;
    setBudgetItems(prev => [...prev, newItem]);
    setSelectedCategory(prev => ({ ...prev, [newIndex]: 'all' }));
  };

  // Crear plantilla desde producto seleccionado
  const createTemplateFromProduct = (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProductForTemplate(product);
      setShowCreateTemplateModal(true);
    }
  };

  // Remover item
  const removeBudgetItem = (index: number) => {
    setBudgetItems(prev => prev.filter((_, i) => i !== index));
    setSearchTerms(prev => {
      const newTerms = { ...prev };
      delete newTerms[index];
      return newTerms;
    });
    setShowDropdowns(prev => {
      const newDropdowns = { ...prev };
      delete newDropdowns[index];
      return newDropdowns;
    });
    setDropdownPositions(prev => {
      const newPositions = { ...prev };
      delete newPositions[index];
      return newPositions;
    });
  };

  // Actualizar item específico
  const updateBudgetItem = (index: number, updates: Partial<BudgetFormItem>) => {
    setBudgetItems(prev => prev.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    ));
  };

  // Obtener items filtrados (productos + plantillas) para búsqueda
  const getFilteredItems = useCallback((index: number) => {
    const searchTerm = searchTerms[index] || '';
    const category = selectedCategory[index] || 'all';
    const items: Array<{type: 'product' | 'template', item: Product | ProductTemplate}> = [];
    
    // Agregar productos si corresponde
    if (category === 'all' || category === 'products') {
      products.forEach(product => {
        const matchesSearch = !searchTerm || 
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.serial_number && product.serial_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (matchesSearch) {
          items.push({ 
            type: 'product', 
            item: product,
          });
        }
      });
    }

    // Agregar plantillas si corresponde
    if (category === 'all' || category === 'templates') {
      templates.forEach(template => {
        const baseProduct = products.find(p => p.id === template.product_id);
        const templateName = baseProduct ? `${baseProduct.name} (Plantilla)` : `Plantilla #${template.id}`;
        
        const matchesSearch = !searchTerm || 
          templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (template.colors && template.colors.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (matchesSearch) {
          items.push({ 
            type: 'template', 
            item: { ...template, name: templateName, product_name: baseProduct?.name } as any
          });
        }
      });
    }

    // Ordenar: favoritos primero, luego por nombre
    return items.sort((a, b) => {
      const nameA = a.type === 'product' ? (a.item as Product).name : (a.item as any).name;
      const nameB = b.type === 'product' ? (b.item as Product).name : (b.item as any).name;
      return nameA.localeCompare(nameB);
    });
  }, [searchTerms, selectedCategory, products, templates]);

  // Seleccionar item (producto o plantilla)
  const selectItem = (index: number, type: 'product' | 'template', item: Product | ProductTemplate) => {
    if (type === 'product') {
      const product = item as Product;
      updateBudgetItem(index, {
        type: 'product',
        id: product.id,
        name: product.name,
        unit_price: product.price,
        description: product.description,
        serial_number: product.serial_number
      });
      setSearchTerms(prev => ({ ...prev, [index]: `${product.name}${product.serial_number ? ` (${product.serial_number})` : ''}` }));
    } else {
      const template = item as ProductTemplate;
      const baseProduct = products.find(p => p.id === template.product_id);
      const templateName = baseProduct ? `${baseProduct.name} (Plantilla)` : `Plantilla #${template.id}`;
      
      updateBudgetItem(index, {
        type: 'template',
        id: template.id,
        name: templateName,
        unit_price: template.final_price,
        description: template.description,
        width: template.width,
        height: template.height,
        colors: template.colors,
        position: template.position,
        texts: template.texts
      });
      setSearchTerms(prev => ({ ...prev, [index]: templateName }));
    }
    
    setShowDropdowns(prev => ({ ...prev, [index]: false }));
  };

  const onSubmit = async (formData: CreateBudgetForm) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Validar que hay items
      if (budgetItems.length === 0) {
        setError('Debe agregar al menos un producto o plantilla');
        return;
      }

      // Validar que todos los items tienen selección válida
      const invalidItems = budgetItems.filter(item => !item.id || item.id === 0);
      if (invalidItems.length > 0) {
        setError('Todos los productos/plantillas deben estar seleccionados');
        return;
      }

      // Validar que se seleccionó un cliente
      if (!selectedClientId) {
        setError('Debe seleccionar un cliente');
        return;
      }

      // Crear el objeto de presupuesto
      const budgetData: CreateBudgetForm = {
        ...formData,
        client_id: selectedClientId,
        user_id: currentUserId
      };

      // Guardar en la base de datos
      const newBudget = await BudgetApiService.create(budgetData);
      
      onBudgetCreated(newBudget);
      handleClose();

    } catch (err: any) {
      console.error('Error creating budget', err);
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setBudgetItems([]);
    setSearchTerms({});
    setShowDropdowns({});
    setDropdownPositions({});
    setSelectedCategory({});
    setSelectedProductForTemplate(null);
    setClientSearchTerm('');
    setSelectedClientId(null);
    setShowClientDropdown(false);
    setError(null);
    onClose();
  };

  const handleClientCreated = (newClient: Client) => {
    setClients(prev => [...prev, newClient]);
    setSelectedClientId(newClient.id);
    setValue('client_id', newClient.id);
    setClientSearchTerm(`${newClient.name} - ${newClient.phone}`);
  };

  const handleProductCreated = (newProduct: Product) => {
    setProducts(prev => [...prev, newProduct]);
  };

  const handleTemplateCreated = (newTemplate: ProductTemplate) => {
    setTemplates(prev => [...prev, newTemplate]);
  };

  // Función para abrir la vista previa de impresión
  const handlePrint = () => {
    // Validar que hay un cliente seleccionado
    if (!selectedClientId) {
      toast.error('Debe seleccionar un cliente para imprimir');
      return;
    }

    if (budgetItems.length === 0) {
      toast.error('Debe agregar al menos un producto o plantilla para imprimir');
      return;
    }

    // Validar que todos los items tienen datos válidos
    const invalidItems = budgetItems.filter(item => !item.id || item.id === 0 || !item.name.trim());
    if (invalidItems.length > 0) {
      toast.error('Todos los productos/plantillas deben estar seleccionados antes de imprimir');
      return;
    }

    // Abrir el modal de vista previa
    setShowPrintPreview(true);
  };

  // Obtener lista filtrada de clientes
  const getFilteredClients = () => {
    if (!clientSearchTerm.trim()) return clients;
    
    const searchLower = clientSearchTerm.toLowerCase();
    return clients.filter(client => 
      client.name.toLowerCase().includes(searchLower) ||
      (client.phone && client.phone.includes(searchLower))
    );
  };

  // Seleccionar un cliente
  const selectClient = (client: Client) => {
    setSelectedClientId(client.id);
    setValue('client_id', client.id);
    setClientSearchTerm(`${client.name} - ${client.phone}`);
    setShowClientDropdown(false);
  };





  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <ReceiptText className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Nuevo Presupuesto</h2>
              <p className="text-sm text-gray-500">Crear presupuesto con productos y/o plantillas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-2"
              disabled={budgetItems.length === 0}
            >
              <Printer size={16} />
              Imprimir Presupuesto
            </Button> */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Cliente */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="client_id" className="text-sm font-medium text-gray-700">
                  Cliente *
                </Label>
                <Button
                  type="button"
                  onClick={() => setShowCreateClientModal(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 text-xs px-3 py-1 h-7 border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <User size={12} />
                  Nuevo Cliente
                </Button>
              </div>
              <div className="mt-1">
                {loadingClients ? (
                  <div className="flex items-center gap-2 p-2 border rounded-lg">
                    <Loader className="animate-spin" size={16} />
                    <span className="text-sm text-gray-500">Cargando clientes...</span>
                  </div>
                ) : clients.length === 0 ? (
                  <div className="flex items-center justify-between p-3 border border-dashed border-gray-300 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500">
                      <User size={16} />
                      <span className="text-sm">No hay clientes registrados</span>
                    </div>
                    <Button
                      type="button"
                      onClick={() => setShowCreateClientModal(true)}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Plus size={14} />
                      Crear Primer Cliente
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={16} />
                      <Input
                        id="client-search-input"
                        type="text"
                        placeholder="Buscar cliente por nombre o teléfono..."
                        value={clientSearchTerm}
                        onChange={(e) => {
                          const searchTerm = e.target.value;
                          setClientSearchTerm(searchTerm);
                          setShowClientDropdown(true);
                          
                          // Si el texto no coincide con el cliente seleccionado, limpiar la selección
                          if (selectedClientId) {
                            const selectedClient = clients.find(c => c.id === selectedClientId);
                            if (selectedClient && searchTerm !== `${selectedClient.name} - ${selectedClient.phone}`) {
                              setSelectedClientId(null);
                              setValue('client_id', 0);
                            }
                          }
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        className="pl-10 pr-4"
                      />
                    </div>
                    
                    {/* Dropdown de clientes */}
                    {showClientDropdown && (
                      <div 
                        id="client-dropdown"
                        className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                      >
                        {getFilteredClients().length > 0 ? (
                          getFilteredClients().map((client) => (
                            <div
                              key={client.id}
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 group"
                              onClick={() => selectClient(client)}
                            >
                              <div className="flex items-center gap-2">
                                {client.color && (
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: client.color }}
                                  />
                                )}
                                <User className="h-4 w-4 text-gray-400" />
                                <div className="flex-1">
                                  <div className="font-medium text-sm text-gray-900">
                                    {client.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {client.phone}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-4 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <User className="h-8 w-8 text-gray-400" />
                              <p className="text-sm text-gray-500 mb-2">No se encontraron clientes</p>
                              {clientSearchTerm && (
                                <div className="flex flex-col gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setClientSearchTerm('');
                                      setShowClientDropdown(true);
                                    }}
                                    className="text-xs"
                                  >
                                    Limpiar búsqueda
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => {
                                      setShowCreateClientModal(true);
                                      setShowClientDropdown(false);
                                    }}
                                    className="text-xs"
                                  >
                                    <Plus size={12} className="mr-1" />
                                    Crear cliente
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {errors.client_id && (
                <p className="mt-1 text-sm text-red-600">{errors.client_id.message}</p>
              )}
            </div>

            {/* Fecha del presupuesto */}
            <div>
              <Label htmlFor="date" className="text-sm font-medium text-gray-700">
                Fecha del presupuesto *
              </Label>
              <div className="mt-1 relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="date"
                  type="date"
                  className="pl-10"
                  {...register('date')}
                />
              </div>
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>



            {/* Total (solo lectura) */}
            <div>
              <Label htmlFor="total" className="text-sm font-medium text-gray-700">
                Total (calculado automáticamente)
              </Label>
              <div className="mt-1 relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="total"
                  type="text"
                  value={`${total.toFixed(2)}`}
                  className="pl-10 bg-gray-50"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Sección de Items (Productos y Plantillas) */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">Productos y Plantillas</h3>
                <span className="text-sm text-gray-500">({budgetItems.length} items)</span>
                {budgetItems.length > 0 && (
                  <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-green-50 rounded-full">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">
                      Subtotal: ${total.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => setShowCreateProductModal(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus size={16} />
                  Crear Producto
                </Button>
                <Button
                  type="button"
                  onClick={addBudgetItem}
                  className="flex items-center gap-2"
                  size="sm"
                  disabled={loadingProducts || loadingTemplates}
                >
                  <Plus size={16} />
                  Agregar Item
                </Button>
              </div>
            </div>

            {(loadingProducts || loadingTemplates) ? (
              <div className="flex items-center justify-center p-8 border border-dashed rounded-lg">
                <Loader className="animate-spin" size={24} />
                <span className="ml-2 text-gray-500">Cargando productos y plantillas...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {budgetItems.length === 0 ? (
                  <div className="text-center p-8 border border-dashed rounded-lg text-gray-500">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Package className="h-12 w-12 text-gray-300" />
                      <Layers className="h-12 w-12 text-gray-300" />
                    </div>
                    <p className="text-lg font-medium text-gray-700 mb-2">No hay productos o plantillas agregados</p>
                    <p className="text-sm mb-4">Haz clic en "Agregar Item" para comenzar a crear tu presupuesto</p>
                    <div className="flex flex-col items-center gap-2 text-xs text-gray-400">
                      <p>💡 <strong>Tip:</strong> Puedes crear productos y plantillas sobre la marcha</p>
                      <div className="flex items-center gap-4">
                        <span>🏷️ Filtra por tipo de item</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  budgetItems.map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-700">Item #{index + 1}</h4>
                          <span className={`px-2 py-1 text-xs rounded ${
                            item.type === 'product' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.type === 'product' ? 'Producto' : 'Plantilla'}
                          </span>
                          {item.id > 0 && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                              ${(item.quantity * item.unit_price).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {item.id > 0 && (
                            <>
                              {item.type === 'product' && (
                                <Button
                                  type="button"
                                  onClick={() => createTemplateFromProduct(item.id)}
                                  variant="outline"
                                  size="sm"
                                  className="text-purple-600 hover:text-purple-700"
                                  title="Crear plantilla desde este producto"
                                >
                                  <Layers size={16} />
                                </Button>
                              )}
                            </>
                          )}
                          <Button
                            type="button"
                            onClick={() => removeBudgetItem(index)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Selector de Producto/Plantilla */}
                        <div className="lg:col-span-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Producto o Plantilla *
                          </Label>
                          
                          {/* Filtros de categoría */}
                          <div className="mt-1 mb-2 flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant={selectedCategory[index] === 'all' || !selectedCategory[index] ? 'default' : 'outline'}
                              onClick={() => {
                                setSelectedCategory(prev => ({ ...prev, [index]: 'all' }));
                                showDropdown(index);
                              }}
                              className="text-xs px-2 py-1 h-7"
                            >
                              <ShoppingBag size={12} className="mr-1" />
                              Todos
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={selectedCategory[index] === 'products' ? 'default' : 'outline'}
                              onClick={() => {
                                setSelectedCategory(prev => ({ ...prev, [index]: 'products' }));
                                showDropdown(index);
                              }}
                              className="text-xs px-2 py-1 h-7"
                            >
                              <Package size={12} className="mr-1" />
                              Productos ({products.length})
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={selectedCategory[index] === 'templates' ? 'default' : 'outline'}
                              onClick={() => {
                                setSelectedCategory(prev => ({ ...prev, [index]: 'templates' }));
                                showDropdown(index);
                              }}
                              className="text-xs px-2 py-1 h-7"
                            >
                              <Layers size={12} className="mr-1" />
                              Plantillas ({templates.length})
                            </Button>
                          </div>
                          
                          <div className="relative">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={16} />
                              <Input
                                id={`item-input-${index}`}
                                type="text"
                                placeholder={`Buscar ${selectedCategory[index] === 'products' ? 'productos' : selectedCategory[index] === 'templates' ? 'plantillas' : 'productos o plantillas'}...`}
                                value={searchTerms[index] || ''}
                                onChange={(e) => {
                                  const searchTerm = e.target.value;
                                  setSearchTerms(prev => ({ ...prev, [index]: searchTerm }));
                                  
                                  if (searchTerm !== item.name) {
                                    updateBudgetItem(index, { id: 0, name: '', unit_price: 0 });
                                  }
                                  
                                  showDropdown(index);
                                }}
                                onFocus={() => {
                                  showDropdown(index);
                                }}
                                className="pl-10 pr-4"
                              />
                            </div>
                            
                            {/* Dropdown de productos y plantillas */}
                            {showDropdowns[index] && dropdownPositions[index] && createPortal(
                              <div 
                                id={`item-dropdown-${index}`}
                                className="fixed z-[9999] bg-white border border-gray-300 rounded-md shadow-lg overflow-y-auto"
                                style={{
                                  top: `${dropdownPositions[index].top}px`,
                                  left: `${dropdownPositions[index].left}px`,
                                  width: `${dropdownPositions[index].width}px`,
                                  maxHeight: `${dropdownPositions[index].maxHeight || 200}px`
                                }}
                              >
                                {getFilteredItems(index).length > 0 ? (
                                  getFilteredItems(index).map((filteredItem, _) => (
                                    <div
                                      key={`${filteredItem.type}-${filteredItem.item.id}`}
                                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 group"
                                    >
                                      <div className="flex justify-between items-center">
                                        <div 
                                          className="flex-1 flex items-start gap-2"
                                          onClick={() => selectItem(index, filteredItem.type, filteredItem.item)}
                                        >
                                          <div className="flex items-center gap-2 flex-1">
                                            {filteredItem.type === 'product' ? (
                                              <Package className="h-4 w-4 text-blue-500" />
                                            ) : (
                                              <Layers className="h-4 w-4 text-purple-500" />
                                            )}
                                            <div className="flex-1">
                                              <div className="font-medium text-sm text-gray-900">
                                                {filteredItem.type === 'product' 
                                                  ? (filteredItem.item as Product).name
                                                  : (filteredItem.item as any).name
                                                }
                                              </div>
                                              {filteredItem.type === 'product' && (filteredItem.item as Product).serial_number && (
                                                <div className="text-xs text-gray-500">
                                                  SN: {(filteredItem.item as Product).serial_number}
                                                </div>
                                              )}
                                              {filteredItem.type === 'template' && (
                                                <div className="text-xs text-gray-500">
                                                  {(filteredItem.item as ProductTemplate).description && (
                                                    <span>{(filteredItem.item as ProductTemplate).description}</span>
                                                  )}
                                                  {(filteredItem.item as ProductTemplate).width && (filteredItem.item as ProductTemplate).height && (
                                                    <span className="ml-2">{(filteredItem.item as ProductTemplate).width}x{(filteredItem.item as ProductTemplate).height}cm</span>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="text-sm font-semibold text-green-600">
                                            ${filteredItem.type === 'product' 
                                              ? (filteredItem.item as Product).price.toFixed(2)
                                              : (filteredItem.item as ProductTemplate).final_price.toFixed(2)
                                            }
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-3 py-4 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                      <div className="text-gray-400">
                                        {selectedCategory[index] === 'products' ? (
                                          <Package className="h-8 w-8" />
                                        ) : selectedCategory[index] === 'templates' ? (
                                          <Layers className="h-8 w-8" />
                                        ) : (
                                          <Search className="h-8 w-8" />
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-500 mb-2">No se encontraron items</p>
                                      {searchTerms[index] && (
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setSearchTerms(prev => ({ ...prev, [index]: '' }));
                                            setSelectedCategory(prev => ({ ...prev, [index]: 'all' }));
                                          }}
                                          className="text-xs"
                                        >
                                          Limpiar búsqueda
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>,
                              document.body
                            )}
                          </div>
                          
                          {!item.id && (
                            <p className="mt-1 text-sm text-red-600">Seleccione un producto o plantilla</p>
                          )}
                        </div>

                        {/* Cantidad */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Cantidad *</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateBudgetItem(index, { quantity: parseInt(e.target.value) || 1 })}
                            className="mt-1"
                          />
                        </div>

                        {/* Precio */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Precio *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => updateBudgetItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                            className="mt-1"
                          />
                        </div>

                        {/* Información adicional del item */}
                        {item.id > 0 && (
                          <div className="lg:col-span-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              {item.serial_number && (
                                <div>
                                  <span className="font-medium text-gray-600">Número de serie:</span>
                                  <p className="text-gray-700">{item.serial_number}</p>
                                </div>
                              )}
                              {item.width && item.height && (
                                <div>
                                  <span className="font-medium text-gray-600">Dimensiones:</span>
                                  <p className="text-gray-700">{item.width} x {item.height} cm</p>
                                </div>
                              )}
                              {item.colors && (
                                <div>
                                  <span className="font-medium text-gray-600">Colores:</span>
                                  <p className="text-gray-700">{item.colors}</p>
                                </div>
                              )}
                              {item.position && (
                                <div>
                                  <span className="font-medium text-gray-600">Posición:</span>
                                  <p className="text-gray-700">{item.position}</p>
                                </div>
                              )}
                              {item.description && (
                                <div className="md:col-span-3">
                                  <span className="font-medium text-gray-600">Descripción:</span>
                                  <p className="text-gray-700">{item.description}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || budgetItems.length === 0 || !selectedClientId}
              className="flex items-center gap-2"
            >
              {isSubmitting && <Loader className="animate-spin" size={16} />}
              {isSubmitting ? 'Creando...' : `Crear Presupuesto (${budgetItems.length} items)`}
            </Button>
          </div>
        </form>
      </div>
      
      {/* Modal de crear cliente */}
      <CreateClientModal
        isOpen={showCreateClientModal}
        onClose={() => setShowCreateClientModal(false)}
        onClientCreated={handleClientCreated}
      />
      
      {/* Modal de crear producto */}
      <QuickCreateProductModal
        isOpen={showCreateProductModal}
        onClose={() => setShowCreateProductModal(false)}
        onProductCreated={handleProductCreated}
        prefilledName=""
      />
      
      {/* Modal de crear plantilla */}
      {selectedProductForTemplate && (
        <CreateTemplateModal
          isOpen={showCreateTemplateModal}
          onClose={() => {
            setShowCreateTemplateModal(false);
            setSelectedProductForTemplate(null);
          }}
          onTemplateCreated={handleTemplateCreated}
          product={selectedProductForTemplate}
        />
      )}
      
      {/* Modal de vista previa de impresión */}
      {showPrintPreview && selectedClientId && (
        <BudgetPrintPreviewModal
          isOpen={showPrintPreview}
          onClose={() => setShowPrintPreview(false)}
          budgetData={{
            id: nextBudgetId,
            client_id: selectedClientId || 0,
            user_id: currentUserId,
            date: (document.getElementById('date') as HTMLInputElement)?.value || new Date().toISOString().split('T')[0],
            total: total,
            client: selectedClientId ? clients.find(c => c.id === selectedClientId) : undefined,
            budgetProducts: budgetItems.map((item, index) => ({
              id: index,
              budget_id: nextBudgetId,
              product_id: item.type === 'product' ? item.id : null,
              template_id: item.type === 'template' ? item.id : null,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.quantity * item.unit_price,
              product_name: item.name
            }))
          }}
        />
      )}
    </div>
  );
};

export default CreateBudgetModal;