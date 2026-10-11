interface SimilarProductNamesData {
  word: string;
  count: number;
  products: Array<{ id: number; name: string; serial_number: string | null }>;
}

class SimilarProductNames {
  word: string;
  count: number;
  products: Array<{ id: number; name: string; serial_number: string | null }>;

  constructor({ word, count, products }: SimilarProductNamesData) {
    this.word = word;
    this.count = count;
    this.products = products || [];
  }

  getWord(): string { return this.word; }
  getCount(): number { return this.count; }
  getProducts(): Array<{ id: number; name: string; serial_number: string | null }> { return this.products; }

  toPlainObject() {
    return { word: this.word, count: this.count, products: this.products };
  }
}

export default SimilarProductNames;
