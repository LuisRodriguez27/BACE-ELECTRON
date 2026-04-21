class ProductTemplate {
  constructor({
    id,
    product_id,
    final_price,
    promo_price,
    discount_price,
    width,
    height,
    colors,
    position,
    texts,
    description,
    created_by,
    active = true,
    product_name,
    serial_number,
    created_by_username
  }) {
    this.id = id;
    this.product_id = product_id;
    this.final_price = parseFloat(final_price) || 0;
    this.promo_price = promo_price !== null && promo_price !== undefined ? parseFloat(promo_price) : null;
    this.discount_price = discount_price !== null && discount_price !== undefined ? parseFloat(discount_price) : null;
    this.width = width ? parseFloat(width) : null;
    this.height = height ? parseFloat(height) : null;
    this.colors = colors || null;
    this.position = position || null;
    this.texts = texts || null;
    this.description = description || null;
    this.created_by = created_by || null;
    this.active = active;

    // Información adicional del producto y usuario
    this.product_name = product_name || null;
    this.serial_number = serial_number || null;
    this.created_by_username = created_by_username || null;
  }

  // Métodos de utilidad para el dominio
  isActive() {
    return this.active === 1;
  }

  hasCustomDimensions() {
    return this.width !== null && this.height !== null;
  }

  hasColors() {
    return this.colors && this.colors.trim().length > 0;
  }

  hasPosition() {
    return this.position && this.position.trim().length > 0;
  }

  hasTexts() {
    return this.texts && this.texts.trim().length > 0;
  }

  hasDescription() {
    return this.description && this.description.trim().length > 0;
  }

  isFree() {
    return this.final_price === 0;
  }

  isPaid() {
    return this.final_price > 0;
  }

  getDisplayName() {
    if (this.hasDescription()) {
      return `${this.product_name} - ${this.description}`;
    }
    return `${this.product_name} - Plantilla ${this.id}`;
  }

  getFormattedPrice() {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(this.final_price);
  }

  getDimensions() {
    if (!this.hasCustomDimensions()) {
      return null;
    }
    return `${this.width} × ${this.height}`;
  }

  // Parsear colores (texto plano)
  getColorsText() {
    return this.colors || '';
  }

  // Parsear textos (texto plano)
  getTextsText() {
    return this.texts || '';
  }

  // Validación básica
  isValid() {
    return (
      this.product_id &&
      this.product_id > 0 &&
      typeof this.final_price === 'number' &&
      this.final_price >= 0 &&
      !isNaN(this.final_price)
    );
  }

  // Para búsquedas y filtros
  matchesSearchTerm(searchTerm) {
    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();
    return (
      (this.product_name && this.product_name.toLowerCase().includes(term)) ||
      (this.description && this.description.toLowerCase().includes(term)) ||
      (this.serial_number && this.serial_number.toLowerCase().includes(term)) ||
      (this.position && this.position.toLowerCase().includes(term)) ||
      (this.texts && this.texts.toLowerCase().includes(term)) ||
      (this.created_by_username && this.created_by_username.toLowerCase().includes(term))
    );
  }

  toPlainObject() {
    return {
      id: this.id,
      product_id: this.product_id,
      final_price: this.final_price,
      promo_price: this.promo_price,
      discount_price: this.discount_price,
      width: this.width,
      height: this.height,
      colors: this.colors,
      position: this.position,
      texts: this.texts,
      description: this.description,
      created_by: this.created_by,
      active: this.active,
      product_name: this.product_name,
      serial_number: this.serial_number,
      created_by_username: this.created_by_username
    };
  }
}

module.exports = ProductTemplate;
