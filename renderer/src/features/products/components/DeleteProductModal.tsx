import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductsApiService } from '../ProductsApiService';
import type { Product } from '../types';

interface DeleteProductModalProps {
	isOpen: boolean;
	onClose: () => void;
	onProductDeleted: (productId: number) => void;
	product: Product | null;
}

const DeleteProductModal: React.FC<DeleteProductModalProps> = ({
	isOpen,
	onClose,
	onProductDeleted,
	product
}) => {
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleDelete = async () => {
		if (!product) return;

		try {
			setIsDeleting(true);
			setError(null);

			await ProductsApiService.delete(product.id);
			onProductDeleted(product.id);
			onClose();
		} catch (err) {
			console.error('Error deleting product:', err);
			setError('Error al eliminar el producto. Intenta nuevamente.');
		} finally {
			setIsDeleting(false);
		}
	};

	const handleClose = () => {
		setError(null);
		onClose();
	};

	if (!isOpen || !product) return null;

	return (
		<div
			className="fixed inset-0 flex items-center justify-center z-50"
			style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
		>
			<div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
				{/* Header */}
				<div className="p-6 border-b border-gray-200">
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
							<AlertTriangle className="h-6 w-6 text-red-600" />
						</div>
						<div>
							<h2 className="text-lg font-medium text-gray-900">Eliminar Producto</h2>
							<p className="text-sm text-gray-500">
								¿Estás seguro de que deseas eliminar el producto <strong>{product.name}</strong>? Esta acción no se puede deshacer.
							</p>
						</div>
					</div>
				</div>

				{/* Content */}
				<div className='p-6'>
					{error && (
						<div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
							<p className='text-sm text-red-800'>{error}</p>
						</div>
					)}

					<div className='space-y-4'>
						{/* Product Details */}
						<div className='p-5 bg-gray-50 rounded-lg'>
							<div className='flex items-center gap-3'>
								<div className='w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center'>
									<ShoppingBag className='h-5 w-5 text-blue-600' />
								</div>
								<div>
									<h3 className='font-medium text-gray-900'>{product.name}</h3>
									<p className='text-sm text-gray-500'>
										Producto #{product.id}
									</p>
								</div>
							</div>
						</div>

						{/* Warning Text */}
						<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
							<div className="flex items-start gap-3">
								<AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
								<div>
									<h4 className="text-sm font-medium text-yellow-800">
										¿Estás seguro de que quieres eliminar este producto?
									</h4>
									<p className="text-sm text-yellow-700 mt-1">
										Esta acción eliminará permanentemente el producto.
										No podrás recuperar estos datos después de la eliminación.
									</p>
								</div>
							</div>
						</div>

					</div>

					{/* Actions */}
					<div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={isDeleting}
						>
							Cancelar
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={handleDelete}
							disabled={isDeleting}
							className="flex items-center gap-2"
						>
							{isDeleting ? (
								<>
									<Loader className="animate-spin" size={16} />
									Eliminando...
								</>
							) : (
								<>
									<Trash2 size={16} />
									Eliminar Producto
								</>
							)}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default DeleteProductModal;