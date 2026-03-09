class SimilarProductNames {
  constructor({ word, count, products }) {
    this.word = word;
    this.count = count;
    this.products = products || [];
  }

  getWord() {
    return this.word;
  }

  getCount() {
    return this.count;
  }

  getProducts() {
    return this.products;
  }

  toPlainObject() {
    return {
      word: this.word,
      count: this.count,
      products: this.products
    };
  }
}

module.exports = SimilarProductNames;
