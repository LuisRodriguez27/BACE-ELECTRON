class Product {
  constructor({ id, name, serial_number, price, promo_price, discount_price, description, images, active = true }) {
    this.id = id;
    this.name = name;
    this.serial_number = serial_number || null;
    this.price = parseFloat(price) || 0;
    this.promo_price = promo_price !== null && promo_price !== undefined ? parseFloat(promo_price) : null;
    this.discount_price = discount_price !== null && discount_price !== undefined ? parseFloat(discount_price) : null;
    this.description = description || null;
    
    // Parseo de array images o fallback general a vacío
    let parsedImages = [];
    if (images) {
      if (typeof images === 'string') {
        try { parsedImages = JSON.parse(images); } catch(e) {}
      } else if (Array.isArray(images)) {
        parsedImages = images;
      }
    }
    
    this.images = parsedImages;
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
      promo_price: this.promo_price,
      discount_price: this.discount_price,
      description: this.description,
      images: this.images,
      active: this.active
    };
  }
}

module.exports = Product;
