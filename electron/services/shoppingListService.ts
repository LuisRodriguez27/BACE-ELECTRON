import shoppingListRepository from '../repositories/shoppingListRepository';
import productRepository from '../repositories/productRepository';
import type { OpenShoppingListData, CloseShoppingListData, AddShoppingListItemData, UpdateShoppingListItemData } from '../types/shoppingList';

class ShoppingListService {
  async getActive() {
    try {
      const list = await shoppingListRepository.getActive();
      return list ? list.toPlainObject() : null;
    } catch (error) {
      console.error('Error al obtener lista de compras activa:', error);
      throw new Error('Error al obtener lista de compras activa');
    }
  }

  async getById(id: number) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de lista de compras inválido');
      const list = await shoppingListRepository.getById(id);
      if (!list) throw new Error('Lista de compras no encontrada');
      return list.toPlainObject();
    } catch (error) {
      console.error('Error al obtener lista de compras:', error);
      throw error;
    }
  }

  async getHistory(page = 1, limit = 20) {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 20;
      const result = await shoppingListRepository.getClosedPaginated(page, limit);
      return { data: result.data.map((l) => l.toPlainObject()), pagination: result.pagination };
    } catch (error) {
      console.error('Error al obtener historial de listas de compras:', error);
      throw new Error('Error al obtener historial de listas de compras');
    }
  }

  async open(data: OpenShoppingListData) {
    try {
      const list = await shoppingListRepository.open({
        notes: data?.notes?.trim() || null,
        created_by: data?.created_by ? parseInt(String(data.created_by), 10) : null
      });
      return list.toPlainObject();
    } catch (error) {
      console.error('Error al abrir lista de compras:', error);
      throw error;
    }
  }

  async close(id: number, data: CloseShoppingListData) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de lista de compras inválido');
      const list = await shoppingListRepository.close(id, { notes: data?.notes?.trim() || null });
      return list.toPlainObject();
    } catch (error) {
      console.error('Error al cerrar lista de compras:', error);
      throw error;
    }
  }

  async addItem(data: AddShoppingListItemData) {
    try {
      const active = await shoppingListRepository.getActive();
      if (!active) throw new Error('No hay una lista de compras abierta. Abre una lista antes de agregar productos.');

      if (!data.product_id || isNaN(Number(data.product_id))) throw new Error('Debes seleccionar una familia de producto válida');
      const productId = parseInt(String(data.product_id), 10);

      const product = await productRepository.findById(productId);
      if (!product) throw new Error('El producto especificado no existe');

      const quantity = parseFloat(String(data.quantity));
      if (isNaN(quantity) || quantity <= 0) throw new Error('La cantidad debe ser un número mayor a cero');

      const item = await shoppingListRepository.addItem({
        shopping_list_id: active.id,
        product_id: productId,
        quantity,
        created_by: data.created_by ? parseInt(String(data.created_by), 10) : null
      });
      if (!item) throw new Error('Error al agregar producto a la lista de compras');
      return item.toPlainObject();
    } catch (error) {
      console.error('Error al agregar producto a la lista de compras:', error);
      throw error;
    }
  }

  async updateItem(id: number, data: UpdateShoppingListItemData) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de item inválido');
      const payload: { quantity?: number; purchased?: boolean } = {};
      if (data.quantity !== undefined) {
        const quantity = parseFloat(String(data.quantity));
        if (isNaN(quantity) || quantity <= 0) throw new Error('La cantidad debe ser un número mayor a cero');
        payload.quantity = quantity;
      }
      if (data.purchased !== undefined) payload.purchased = !!data.purchased;
      if (Object.keys(payload).length === 0) throw new Error('No se proporcionaron campos válidos para actualizar');

      const item = await shoppingListRepository.updateItem(id, payload);
      if (!item) throw new Error('Item no encontrado');
      return item.toPlainObject();
    } catch (error) {
      console.error('Error al actualizar item de lista de compras:', error);
      throw error;
    }
  }

  async removeItem(id: number) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de item inválido');
      const deleted = await shoppingListRepository.removeItem(id);
      if (!deleted) throw new Error('Error al eliminar el producto de la lista de compras');
    } catch (error) {
      console.error('Error al eliminar item de lista de compras:', error);
      throw error;
    }
  }
}

export default new ShoppingListService();
