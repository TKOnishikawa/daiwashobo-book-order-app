export interface BookMasterRecord {
  isbn13: string;
  title: string;
  author: string;
  price: string;
  pub_date: string;
  genre: string;
  cover_url: string;
}

export interface SalesRow {
  store: string;
  stock: string;
  sold: string;
}

export interface OrderFormData {
  isbn: string;
  title: string;
  subtitle: string;
  author: string;
  authorTitle: string;
  price: string;
  size: string;
  pages: string;
  pubdate: string;
  doctype: string;
  genreTag: string;
  badgeText: string;
  catchCopy: string;
  subCatch: string;
  promoLine1: string;
  promoLine2: string;
  promoLine3: string;
  prText: string;
}
