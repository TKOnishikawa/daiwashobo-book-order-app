import type { BookMasterRecord } from "@/types/book";

export function normalizeIsbn(s: string): string {
  return s.replace(/[^0-9Xx]/g, "");
}

function hyphenateIsbn(isbn: string): string {
  return isbn.replace(
    /(\d{3})(\d)(\d{3})(\d{5})(\d)/,
    "$1-$2-$3-$4-$5"
  );
}

export function buildIsbnIndex(
  records: BookMasterRecord[]
): Map<string, BookMasterRecord> {
  const index = new Map<string, BookMasterRecord>();
  for (const b of records) {
    index.set(b.isbn13, b);
    index.set(hyphenateIsbn(b.isbn13), b);
    // 5-digit book code (item identifier portion of ISBN)
    const digits = b.isbn13.replace(/[^0-9]/g, "");
    if (digits.length === 13) {
      const code5 = digits.substring(7, 12);
      // Only set if not already mapped (first match wins)
      if (!index.has(code5)) {
        index.set(code5, b);
      }
    }
  }
  return index;
}

export function lookupByIsbn(
  index: Map<string, BookMasterRecord>,
  rawIsbn: string
): BookMasterRecord | undefined {
  const normalized = normalizeIsbn(rawIsbn);
  return index.get(rawIsbn) || index.get(normalized);
}
