import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ShadingType,
  VerticalAlign,
  HeightRule,
  BorderStyle,
  TableLayoutType,
} from "docx";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import type { OrderFormData, SalesRow } from "@/types/book";
import { normalizeIsbn } from "@/lib/book-master";
import { SIZES, FONTS, COLORS, ptToDocx, colorToDocx } from "@/lib/layout-constants";

const S = (pt: number) => ptToDocx(pt);
const C = (hex: string) => colorToDocx(hex);

// A4: 11906 x 16838 TWIP, Margins: 400 top/bottom, 600 left/right
// Usable: 10706 x 16038 TWIP
const PAGE_W = 10706;

// Column widths for 2-column area
const COL_LEFT_W = 4200;
const COL_RIGHT_W = PAGE_W - COL_LEFT_W;

// No border
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDER = { top: NONE, bottom: NONE, left: NONE, right: NONE };
const NO_BORDER_TABLE = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
  insideH: { style: BorderStyle.NONE, size: 0 },
  insideV: { style: BorderStyle.NONE, size: 0 },
};
const THIN_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 2, color: "333333" },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: "333333" },
  left: { style: BorderStyle.SINGLE, size: 2, color: "333333" },
  right: { style: BorderStyle.SINGLE, size: 2, color: "333333" },
};

function blackShd() { return { type: ShadingType.SOLID, color: C(COLORS.bannerBg) }; }
function greenShd() { return { type: ShadingType.SOLID, color: C(COLORS.titleBlockBg) }; }
function yellowShd() { return { type: ShadingType.SOLID, color: "FFFF00" }; }

function base64ToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function renderGenreBadge(text: string): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 160;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = "#000000"; ctx.lineWidth = 5;
  ctx.beginPath();
  const cx = 120, cy = 80, outerR = 110, innerR = 72, points = 14;
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI * i) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle), y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#000000"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "bold 34px 'Noto Sans JP', sans-serif"; ctx.fillText(text, cx, cy - 14);
  ctx.font = "bold 20px 'Noto Sans JP', sans-serif"; ctx.fillText("ご担当者様", cx, cy + 20);
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fullCell(children: Paragraph[], shading?: any, vAlign?: any): TableCell {
  return new TableCell({
    columnSpan: 2, width: { size: PAGE_W, type: WidthType.DXA },
    shading, verticalAlign: vAlign || VerticalAlign.CENTER, borders: NO_BORDER, children,
  });
}

export async function generateWord(
  form: OrderFormData,
  salesData: SalesRow[],
  coverImage: string | null,
  displayImage: string | null
) {
  const isbn13 = normalizeIsbn(form.isbn);
  // 新刊案内時は「本体」→「予価」、「注文数」→「予約数」
  const isAdvance = form.doctype === "新刊案内";
  const priceLabel = isAdvance ? "予価" : "本体";
  const qtyLabel = isAdvance ? "予約数" : "注文数";
  const bookSpecs = [form.size, form.pages ? form.pages + "頁" : "", form.price ? priceLabel + form.price + "円+税" : ""]
    .filter(Boolean).join("\u3000");
  const activeSales = salesData.filter((s) => s.store);

  // Prepare images
  let badgeImg: Uint8Array | null = null;
  if (form.genreTag) { try { badgeImg = await renderGenreBadge(form.genreTag); } catch { /* */ } }
  let coverImg: Uint8Array | null = null;
  if (coverImage) { try { coverImg = base64ToUint8Array(coverImage); } catch { /* */ } }
  let displayImg: Uint8Array | null = null;
  if (displayImage) { try { displayImg = base64ToUint8Array(displayImage); } catch { /* */ } }

  const rows: TableRow[] = [];

  // ============================================================
  // Row 1: Banner — height 851 (from user edit)
  // ============================================================
  const bannerRuns: (TextRun | ImageRun)[] = [];
  if (badgeImg) {
    // Badge: anchor wrapNone (前面), cx 1308100 cy 878840 EMU ≈ 137x92 pt
    // Position: posH=-6350 posV=-640715 (overlaps above banner)
    bannerRuns.push(new ImageRun({ data: badgeImg, transformation: { width: 137, height: 92 }, type: "png" }));
    bannerRuns.push(new TextRun({ text: "  ", size: S(12), font: FONTS.gothicUB }));
  }
  bannerRuns.push(new TextRun({
    text: `大和書房\u3000${form.doctype}`,
    size: S(SIZES.banner), color: C(COLORS.bannerText), font: FONTS.gothicUB,
  }));
  rows.push(new TableRow({
    height: { value: 851, rule: HeightRule.EXACT },
    children: [fullCell([new Paragraph({ alignment: AlignmentType.CENTER, children: bannerRuns })], blackShd())],
  }));

  // ============================================================
  // Row 2: Catch copy — no spacing override
  // ============================================================
  if (form.catchCopy) {
    rows.push(new TableRow({
      height: { value: 550, rule: HeightRule.EXACT },
      children: [fullCell([new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: form.catchCopy, bold: true, size: S(SIZES.catchMain), color: C(COLORS.catchText), font: FONTS.gothicUB })],
      })], blackShd())],
    }));
  }

  // ============================================================
  // Row 3: Sub catch — no spacing override
  // ============================================================
  if (form.subCatch) {
    rows.push(new TableRow({
      height: { value: 450, rule: HeightRule.EXACT },
      children: [fullCell([new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: form.subCatch, bold: true, size: S(SIZES.catchSub), color: C(COLORS.catchText), font: FONTS.gothicUB })],
      })], blackShd())],
    }));
  }

  // ============================================================
  // Row 4: FAX row — no alignment/spacing overrides
  // ============================================================
  rows.push(new TableRow({
    height: { value: 700, rule: HeightRule.EXACT },
    children: [
      new TableCell({
        width: { size: COL_LEFT_W, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER, borders: NO_BORDER,
        children: [new Paragraph({
          children: [new TextRun({ text: "大和書房営業部", bold: true, size: S(14), font: FONTS.gothicUBP })],
        })],
      }),
      new TableCell({
        width: { size: COL_RIGHT_W, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER, borders: NO_BORDER,
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "FAX：", bold: true, size: S(12), font: FONTS.gothicUBP }),
              new TextRun({ text: "03-3207-8740", bold: true, size: S(14), font: FONTS.msGothic }),
              new TextRun({ text: "\u3000または\u3000", bold: true, size: S(12), font: FONTS.msGothic }),
              new TextRun({ text: "03-3207-8480", bold: true, size: S(12), font: FONTS.msGothic }),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: "BOOKインタラクティブからも注文できます", size: S(8), font: FONTS.msGothic })],
          }),
        ],
      }),
    ],
  }));

  // ============================================================
  // Row 5: Title — green bg, center aligned
  // ============================================================
  // titleOffsetY (px) → TWIP変換 (1px ≈ 15 TWIP at 96dpi). 負値は0に丸める（spacing.beforeは非負）
  const offsetTwip = Math.max(0, (form.titleOffsetY || 0) * 15);
  const titleParas: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40 + offsetTwip },
      children: [new TextRun({ text: form.title, bold: true, size: S(SIZES.title), color: C(COLORS.titleBlockText), font: FONTS.gothicUBP })],
    }),
  ];
  if (form.subtitle) {
    titleParas.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: form.subtitle, bold: true, size: S(SIZES.subtitle), color: C(COLORS.titleBlockText), font: FONTS.gothicUBP })],
    }));
  }
  // Title row: fixed 2-line height (1686 TWIP) even for single-line titles
  rows.push(new TableRow({
    height: { value: 1686, rule: HeightRule.EXACT },
    children: [fullCell(titleParas, greenShd(), VerticalAlign.CENTER)],
  }));

  // ============================================================
  // Row 6: Author + specs — green bg
  // ============================================================
  const authorRuns: TextRun[] = [];
  if (form.authorTitle) {
    authorRuns.push(new TextRun({ text: form.authorTitle + "\u3000", size: S(SIZES.authorTitle), color: C(COLORS.titleBlockText), font: FONTS.gothicUBP }));
  }
  authorRuns.push(new TextRun({ text: form.author + "\u3000", bold: true, size: S(SIZES.authorName), color: C(COLORS.titleBlockText), font: FONTS.gothicUBP }));
  authorRuns.push(new TextRun({ text: "著", size: S(SIZES.authorSuffix), color: C(COLORS.titleBlockText), font: FONTS.gothicUBP }));
  authorRuns.push(new TextRun({ text: `\u3000\u3000\u3000${bookSpecs}`, size: S(SIZES.specs), color: C(COLORS.titleBlockText), font: FONTS.gothicUBP }));

  rows.push(new TableRow({
    height: { value: 718, rule: HeightRule.EXACT },
    children: [fullCell([new Paragraph({ children: authorRuns })], greenShd(), VerticalAlign.CENTER)],
  }));

  // ============================================================
  // Row 7: Two-column main content
  // Cover image: anchor + wrapThrough (from user edit)
  // Display image: anchor + wrapThrough (from user edit)
  // Sales/promo font sizes doubled (from user edit)
  // ============================================================
  const leftParas: Paragraph[] = [];
  if (coverImg) {
    // Inline image, sized to match user edit (cx 2562225 cy 3719359 EMU ≈ 269x391 pt)
    leftParas.push(new Paragraph({
      spacing: { after: 40 },
      children: [new ImageRun({
        data: coverImg,
        transformation: { width: 269, height: 391 },
        type: "png",
      })],
    }));
  }
  if (form.prText) {
    for (const line of form.prText.split("\n")) {
      leftParas.push(new Paragraph({
        spacing: { before: 10, after: 10 },
        children: [new TextRun({ text: line || " ", size: 14, font: FONTS.msGothic })],
      }));
    }
  }
  if (leftParas.length === 0) {
    leftParas.push(new Paragraph({ children: [] }));
  }

  const rightParas: Paragraph[] = [];

  // Sales header: 10pt → 18pt (user doubled to sz 36)
  if (activeSales.length > 0 || form.salesLabel) {
    rightParas.push(new Paragraph({
      alignment: AlignmentType.CENTER, shading: blackShd(), spacing: { after: 40 },
      children: [new TextRun({ text: form.salesLabel || "初速販売実績", bold: true, size: S(18), color: "FFFFFF", font: FONTS.gothicUB })],
    }));
    // Sales rows: 9pt → 16pt (user doubled to sz 32)
    for (const s of activeSales.slice(0, 4)) {
      rightParas.push(new Paragraph({
        spacing: { before: 10, after: 10 },
        children: [
          new TextRun({ text: s.store, bold: true, size: S(16), font: FONTS.gothicUBP }),
          new TextRun({ text: "\u3000", size: S(16), font: FONTS.gothicUBP }),
          new TextRun({ text: s.value, bold: true, size: S(16), color: "D32F2F", font: FONTS.gothicUBP, shading: yellowShd() }),
        ],
      }));
    }
  }

  // Blank line between sales and promo
  if (activeSales.length > 0 && (form.promoLine1 || form.promoLine2 || form.promoLine3)) {
    rightParas.push(new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: "", size: 10 })] }));
  }

  // Promo line 1: 14pt → 16pt (user: sz 32)
  if (form.promoLine1) {
    rightParas.push(new Paragraph({
      spacing: { before: 80, after: 20 }, shading: yellowShd(),
      children: [new TextRun({ text: form.promoLine1, bold: true, size: S(16), font: FONTS.gothicUBP })],
    }));
  }
  // Promo line 2: 11pt → 20pt (user: sz 40)
  if (form.promoLine2) {
    rightParas.push(new Paragraph({
      spacing: { before: 20, after: 20 },
      children: [new TextRun({ text: form.promoLine2, bold: true, size: S(20), font: FONTS.gothicUBP })],
    }));
  }
  // Promo line 3: 11pt → 20pt (user: sz 40)
  if (form.promoLine3) {
    rightParas.push(new Paragraph({
      spacing: { before: 20, after: 20 }, shading: yellowShd(),
      children: [new TextRun({ text: form.promoLine3, bold: true, size: S(20), font: FONTS.gothicUBP })],
    }));
  }

  // Display image: inline, sized to match user edit (cx 1828800 cy 2651760 EMU ≈ 192x209 pt)
  if (displayImg) {
    rightParas.push(new Paragraph({
      alignment: AlignmentType.RIGHT, spacing: { before: 40 },
      children: [new ImageRun({
        data: displayImg,
        transformation: { width: 192, height: 209 },
        type: "png",
      })],
    }));
  }

  if (rightParas.length === 0) {
    rightParas.push(new Paragraph({ children: [] }));
  }

  // A4 usable: 16038. Fixed rows: 851+550+450+700+1686+718+450+1820=7225. Main=16038-7225=8813
  const mainH = 7519;
  rows.push(new TableRow({
    height: { value: mainH, rule: HeightRule.EXACT },
    children: [
      new TableCell({
        width: { size: COL_LEFT_W, type: WidthType.DXA },
        borders: NO_BORDER,
        children: leftParas,
      }),
      new TableCell({
        width: { size: COL_RIGHT_W, type: WidthType.DXA },
        borders: NO_BORDER,
        children: rightParas,
      }),
    ],
  }));

  // ============================================================
  // Row 8: Materials (left) + Badge (right)
  // ============================================================
  const matParas: Paragraph[] = [];
  if (!form.hideMaterials) {
    matParas.push(new Paragraph({
      spacing: { before: 20 },
      children: [new TextRun({ text: form.materialsLabel || "拡材のご希望：", bold: true, size: S(9), font: FONTS.gothicUB })],
    }));
    matParas.push(new Paragraph({
      children: [new TextRun({ text: form.materialsText || "□A6POP\u3000\u3000□A4パネル（30冊以上）", size: S(9), font: FONTS.gothicUB })],
    }));
  } else {
    matParas.push(new Paragraph({ children: [] }));
  }

  const bdgParas: Paragraph[] = [];
  if (form.badgeText) {
    bdgParas.push(new Paragraph({
      alignment: AlignmentType.CENTER, shading: { type: ShadingType.SOLID, color: C(COLORS.badgeBg) },
      children: [new TextRun({ text: form.badgeText, bold: true, size: S(SIZES.badge), color: C(COLORS.badgeText), font: FONTS.gothicUBP })],
    }));
  } else {
    bdgParas.push(new Paragraph({ children: [] }));
  }

  rows.push(new TableRow({
    height: { value: 450, rule: HeightRule.EXACT },
    children: [
      new TableCell({ width: { size: COL_LEFT_W, type: WidthType.DXA }, borders: NO_BORDER, verticalAlign: VerticalAlign.BOTTOM, children: matParas }),
      new TableCell({ width: { size: COL_RIGHT_W, type: WidthType.DXA }, borders: NO_BORDER, verticalAlign: VerticalAlign.BOTTOM, children: bdgParas }),
    ],
  }));

  // ============================================================
  // Row 9: Order table
  // ============================================================
  const OT_STAMP = 2200, OT_QTY = 900, OT_BOOK = PAGE_W - OT_STAMP - OT_QTY;
  const orderTable = new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        height: { value: 340, rule: HeightRule.EXACT },
        children: [
          new TableCell({ width: { size: OT_STAMP, type: WidthType.DXA }, borders: THIN_BORDER, shading: { type: ShadingType.SOLID, color: "F0F0F0" }, verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "貴 店 印", bold: true, size: S(SIZES.orderHeader), font: FONTS.gothicUB })] })],
          }),
          new TableCell({ width: { size: OT_QTY, type: WidthType.DXA }, borders: THIN_BORDER, shading: { type: ShadingType.SOLID, color: "F0F0F0" }, verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: qtyLabel, bold: true, size: S(SIZES.orderHeader), font: FONTS.gothicUB })] })],
          }),
          new TableCell({ width: { size: OT_BOOK, type: WidthType.DXA }, borders: THIN_BORDER, shading: { type: ShadingType.SOLID, color: "F0F0F0" }, verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ children: [new TextRun({ text: `大和書房｜${form.author.replace(/\u3000+/g, "")}\u3000著`, bold: true, size: S(SIZES.orderHeader), font: FONTS.gothicUB })] })],
          }),
        ],
      }),
      new TableRow({
        height: { value: 1490, rule: HeightRule.EXACT },
        children: [
          new TableCell({ width: { size: OT_STAMP, type: WidthType.DXA }, borders: THIN_BORDER, verticalAlign: VerticalAlign.BOTTOM,
            children: [
              new Paragraph({ spacing: { after: 100 }, children: [] }),
              new Paragraph({ children: [new TextRun({ text: "ご担当者：\u3000\u3000\u3000\u3000\u3000\u3000様", size: S(SIZES.orderContact), font: FONTS.msGothic })] }),
            ],
          }),
          new TableCell({ width: { size: OT_QTY, type: WidthType.DXA }, borders: THIN_BORDER, verticalAlign: VerticalAlign.TOP, children: [new Paragraph({ children: [] })] }),
          new TableCell({ width: { size: OT_BOOK, type: WidthType.DXA }, borders: THIN_BORDER, verticalAlign: VerticalAlign.TOP,
            children: [
              new Paragraph({ spacing: { before: 40, after: 10 }, children: [new TextRun({ text: form.title.replace(/\u3000+/g, ""), bold: true, size: S(SIZES.orderTitle), font: FONTS.gothicUBP })] }),
              ...(form.subtitle ? [new Paragraph({ spacing: { before: 0, after: 10 }, children: [new TextRun({ text: form.subtitle.replace(/\u3000+/g, ""), size: S(SIZES.orderBody), font: FONTS.gothicUBP })] })] : []),
              new Paragraph({ spacing: { before: 20 }, children: [new TextRun({
                text: `ISBN${isbn13}\u3000${form.price ? priceLabel + form.price + "円+税" : ""}\u3000${form.pages ? form.pages + "頁" : ""}\u3000${form.size || ""}\u3000大和書房`,
                size: S(SIZES.orderIsbn), font: FONTS.msGothic, color: "555555",
              })] }),
            ],
          }),
        ],
      }),
    ],
  });

  rows.push(new TableRow({
    height: { value: 1820, rule: HeightRule.EXACT },
    children: [new TableCell({ columnSpan: 2, width: { size: PAGE_W, type: WidthType.DXA }, borders: NO_BORDER, children: [orderTable] })],
  }));

  // ============================================================
  // Build outer table
  // ============================================================
  const mainTable = new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: NO_BORDER_TABLE,
    rows,
    columnWidths: [COL_LEFT_W, COL_RIGHT_W],
  });

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 400, bottom: 400, left: 600, right: 600 } } },
      children: [mainTable],
    }],
  });

  const blob = await Packer.toBlob(doc);

  // Post-process: patch inline images to anchor+wrapThrough for cover & display
  // (docx library can't generate valid wrapThrough with wrapPolygon)
  const patched = await patchInlineToAnchor(blob);

  saveAs(patched, `注文書_${form.title.slice(0, 20)}_${new Date().toISOString().slice(0, 10)}.docx`);
}

/**
 * Patch docx blob: convert wp:inline images to wp:anchor.
 * - Badge: wrapNone (前面), positioned top-left of banner
 * - Cover: wrapThrough (内部), left column
 * - Display: wrapThrough (内部), right column
 */
async function patchInlineToAnchor(blob: Blob): Promise<Blob> {
  const zip = await JSZip.loadAsync(blob);
  const docXml = await zip.file("word/document.xml")!.async("string");

  // EMU values (1pt = 9525 EMU)
  // Badge:   137x92 pt  → 1304925 x 876300
  // Cover:   269x391 pt → 2562225 x 3724275
  // Display: 192x209 pt → 1828800 x 1990725
  const COVER_CX = "2562225";
  const DISPLAY_CX = "1828800";

  let patched = docXml;
  let anchorId = 100;

  const inlineRegex = /<wp:inline[^>]*>([\s\S]*?)<\/wp:inline>/g;
  const replacements: { original: string; replacement: string }[] = [];

  let match;
  while ((match = inlineRegex.exec(docXml)) !== null) {
    const full = match[0];
    const inner = match[1];

    const extentMatch = inner.match(/<wp:extent\s+cx="(\d+)"\s+cy="(\d+)"\/>/);
    if (!extentMatch) continue;
    const cx = extentMatch[1];
    const cy = extentMatch[2];

    let posH: string, posV: string, posHRel: string, posVRel: string;
    let wrapXml: string;
    let newCx = cx, newCy = cy;

    if (cx === COVER_CX) {
      // Cover: wrapThrough
      posH = "19050"; posV = "83820"; posHRel = "column"; posVRel = "paragraph";
      const poly = `<wp:wrapPolygon edited="0"><wp:start x="0" y="0"/><wp:lineTo x="0" y="21600"/><wp:lineTo x="21600" y="21600"/><wp:lineTo x="21600" y="0"/><wp:lineTo x="0" y="0"/></wp:wrapPolygon>`;
      wrapXml = `<wp:wrapThrough wrapText="bothSides">${poly}</wp:wrapThrough>`;
    } else if (cx === DISPLAY_CX) {
      // Display: wrapThrough
      posH = "2292350"; posV = "76200"; posHRel = "column"; posVRel = "paragraph";
      const poly = `<wp:wrapPolygon edited="0"><wp:start x="0" y="0"/><wp:lineTo x="0" y="21600"/><wp:lineTo x="21600" y="21600"/><wp:lineTo x="21600" y="0"/><wp:lineTo x="0" y="0"/></wp:wrapPolygon>`;
      wrapXml = `<wp:wrapThrough wrapText="bothSides">${poly}</wp:wrapThrough>`;
    } else {
      // Badge: wrapNone (前面), resize to 1308100x878840, position top-left
      posH = "-6350"; posV = "-640715"; posHRel = "column"; posVRel = "paragraph";
      newCx = "1308100"; newCy = "878840";
      wrapXml = `<wp:wrapNone/>`;
    }

    // Replace docPr id
    let patchedInner = inner.replace(/<wp:docPr\s+id="\d+"/, `<wp:docPr id="${anchorId}"`);
    // Remove old extent and effectExtent (we'll add new ones)
    patchedInner = patchedInner.replace(/<wp:extent[^/]*\/>/, "").replace(/<wp:effectExtent[^/]*\/>/, "");
    // Also update the inner a:ext if badge was resized
    if (newCx !== cx) {
      patchedInner = patchedInner.replace(
        new RegExp(`<a:ext\\s+cx="${cx}"\\s+cy="${cy}"`),
        `<a:ext cx="${newCx}" cy="${newCy}"`
      );
    }

    const anchor =
      `<wp:anchor distT="0" distB="0" distL="0" distR="0" ` +
      `simplePos="0" allowOverlap="1" behindDoc="0" locked="0" ` +
      `layoutInCell="1" relativeHeight="${anchorId * 1000}">` +
      `<wp:simplePos x="0" y="0"/>` +
      `<wp:positionH relativeFrom="${posHRel}"><wp:posOffset>${posH}</wp:posOffset></wp:positionH>` +
      `<wp:positionV relativeFrom="${posVRel}"><wp:posOffset>${posV}</wp:posOffset></wp:positionV>` +
      `<wp:extent cx="${newCx}" cy="${newCy}"/>` +
      `<wp:effectExtent t="0" r="0" b="0" l="0"/>` +
      wrapXml +
      patchedInner +
      `</wp:anchor>`;

    replacements.push({ original: full, replacement: anchor });
    anchorId++;
  }

  for (const { original, replacement } of replacements) {
    patched = patched.replace(original, replacement);
  }

  zip.file("word/document.xml", patched);
  return await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
