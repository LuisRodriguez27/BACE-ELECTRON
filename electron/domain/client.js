class Client {
  constructor({ id, name, phone, address, description, color, active = 1 }) {
    this.id = id;
    this.name = name;
    this.phone = phone;
    this.address = address || null;
    this.description = description || null;
    this.color = color || null;
    this.active = active;
  }

  // Métodos de utilidad para el dominio
  isActive() {
    return this.active === 1;
  }

  hasAddress() {
    return this.address && this.address.trim().length > 0;
  }

  hasDescription() {
    return this.description && this.description.trim().length > 0;
  }

  hasColor() {
    return this.color && this.color.trim().length > 0;
  }

  getDisplayName() {
    return `${this.name} (${this.phone})`;
  }

  getFormattedPhone() {
    // Formatear teléfono básico (puedes personalizar según tu formato)
    if (!this.phone) return '';
    const cleaned = this.phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return this.phone;
  }

  toPlainObject() {
    return {
      id: this.id,
      name: this.name,
      phone: this.phone,
      address: this.address,
      description: this.description,
      color: this.color,
      active: this.active
    };
  }
}

module.exports = Client;
