export interface BookMasterRecord {
  isbn13: string;
  title: string;
  author: string;
  price: string;
  genre: string;
  size: string;
  pages: string;
}

export interface SalesRow {
  store: string;
  value: string;
}

export interface OrderFormData {
  isbn: string;
  title: string;
  titleSize: number;
  titleOffsetY: number;
  subtitle: string;
  author: string;
  authorTitle: string;
  price: string;
  size: string;
  pages: string;
  doctype: string;
  hideMaterials: boolean;
  genreTag: string;
  badgeText: string;
  catchCopy: string;
  subCatch: string;
  promoLine1: string;
  promoLine2: string;
  promoLine3: string;
  prText: string;
  salesLabel: string;
  materialsLabel: string;
  materialsText: string;
}
