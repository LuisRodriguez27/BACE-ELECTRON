class Supplier {
  constructor({ id, name, phone, email, description, columns, is_active = true }) {
    this.id = id;
    this.name = name;
    this.phone = phone || null;
    this.email = email || null;
    this.description = description || null;
    
    // Parse columns if string, or assign as array
    try {
      this.columns = typeof columns === 'string' ? JSON.parse(columns) : (columns || []);
    } catch (e) {
      this.columns = [];
    }
    
    this.is_active = is_active;
  }

  isActive() {
    return this.is_active === true;
  }

  toPlainObject() {
    return {
      id: this.id,
      name: this.name,
      phone: this.phone,
      email: this.email,
      description: this.description,
      columns: this.columns,
      is_active: this.is_active
    };
  }
}

module.exports = Supplier;
