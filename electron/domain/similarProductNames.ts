interface SimilarProductNamesData {
  word: string;
  count: number;
  products: unknown[];
}

class SimilarProductNames {
  word: string;
  count: number;
  products: unknown[];

  constructor({ word, count, products }: SimilarProductNamesData) {
    this.word = word;
    this.count = count;
    this.products = products || [];
  }

  getWord(): string { return this.word; }
  getCount(): number { return this.count; }
  getProducts(): unknown[] { return this.products; }

  toPlainObject() {
    return { word: this.word, count: this.count, products: this.products };
  }
}

export default SimilarProductNames;
