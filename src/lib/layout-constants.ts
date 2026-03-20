/**
 * 注文書レイアウト定義（pt基準）
 * CSS・Word出力の両方がこのファイルから値を取得する。
 * pt を正として、rem / docx size は変換関数で導出。
 */

// --- Font sizes (pt) ---
export const SIZES = {
  banner: 22,
  catchMain: 26,
  catchSub: 20,
  faxLeft: 22,       // ■大和書房営業部
  faxTag: 18,        // FAX:
  faxMain: 22,       // 03-3207-8740
  faxSub: 16,        // または 03-3207-8480
  faxBook: 10,       // BOOKインタラクティブ
  title: 30,
  subtitle: 12,
  authorTitle: 9,    // 肩書き
  authorName: 22,
  authorSuffix: 14,  // 著
  specs: 11,         // 四六判 312頁 本体1800円
  materialsLabel: 10,
  materialsBody: 10,
  badge: 16,
  orderHeader: 9,
  orderBody: 9,
  orderTitle: 18,    // 注文欄内のタイトル
  orderIsbn: 8,
  orderContact: 7,
} as const;

// --- Colors ---
export const COLORS = {
  bannerBg: "#000000",
  bannerText: "#FFFFFF",
  catchBg: "#000000",
  catchText: "#FFFF00",
  titleBlockBg: "#1B5E20",
  titleBlockText: "#FFFFFF",
  badgeBg: "#111111",
  badgeText: "#FFFFFF",
  faxBorder: "#333333",
  genreTagBg: "#1B5E20",
  genreTagText: "#FFFFFF",
} as const;

// --- Fonts (Word output) ---
export const FONTS = {
  gothicUB: "HGS創英角ｺﾞｼｯｸUB",
  gothicUBP: "HGP創英角ｺﾞｼｯｸUB",
  msGothic: "ＭＳ ゴシック",
} as const;

// --- Conversion functions ---

/** pt → CSS rem (1rem = 16px = 12pt) */
export const ptToRem = (pt: number): number =>
  Math.round((pt / 12) * 1000) / 1000;

/** pt → docx size (docx uses half-point units) */
export const ptToDocx = (pt: number): number => pt * 2;

/** hex color without # for docx */
export const colorToDocx = (hex: string): string =>
  hex.replace("#", "");
