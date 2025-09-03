class Product {
  constructor({ id, name, serial_number, price, description, active = 1 }) {
    this.id = id;
    this.name = name;
    this.serial_number = serial_number || null;
    this.price = parseFloat(price) || 0;
    this.description = description || null;
    this.active = active;
  }

  // Métodos de utilidad para el dominio
  isActive() {
    return this.active === 1;
  }

  hasSerialNumber() {
    return this.serial_number && this.serial_number.trim().length > 0;
  }

  hasDescription() {
    return this.description && this.description.trim().length > 0;
  }

  isFree() {
    return this.price === 0;
  }

  isPaid() {
    return this.price > 0;
  }

  getDisplayName() {
    if (this.hasSerialNumber()) {
      return `${this.name} (${this.serial_number})`;
    }
    return this.name;
  }

  getFormattedPrice() {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(this.price);
  }

  // Validación básica de precio
  isValidPrice() {
    return typeof this.price === 'number' && this.price >= 0 && !isNaN(this.price);
  }

  // Para búsquedas y filtros
  matchesSearchTerm(searchTerm) {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      this.name.toLowerCase().includes(term) ||
      (this.serial_number && this.serial_number.toLowerCase().includes(term)) ||
      (this.description && this.description.toLowerCase().includes(term))
    );
  }

  toPlainObject() {
    return {
      id: this.id,
      name: this.name,
      serial_number: this.serial_number,
      price: this.price,
      description: this.description,
      active: this.active
    };
  }
}

module.exports = Product;
