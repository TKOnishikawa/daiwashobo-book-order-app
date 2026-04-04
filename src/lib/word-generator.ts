import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ShadingType,
  FrameAnchorType,
  FrameWrap,
} from "docx";
import { saveAs } from "file-saver";
import type { OrderFormData, SalesRow } from "@/types/book";
import { normalizeIsbn } from "@/lib/book-master";
import { SIZES, FONTS, COLORS, ptToDocx, colorToDocx } from "@/lib/layout-constants";

const S = (pt: number) => ptToDocx(pt);
const C = (hex: string) => colorToDocx(hex);

// A4 dimensions in TWIP (1 inch = 1440 TWIP, 1mm = 56.7 TWIP)
// A4 = 210mm x 297mm = 11906 x 16838 TWIP
// Margins: 600 TWIP top/bottom, 600 TWIP left/right
// Usable width: 11906 - 1200 = 10706 TWIP
const PAGE_W = 10706;

// Frame helper: absolute position on page
function frame(x: number, y: number, w: number, h: number) {
  return {
    type: "absolute" as const,
    position: { x, y },
    width: w,
    height: h,
    wrap: FrameWrap.NONE,
    anchor: {
      horizontal: FrameAnchorType.PAGE,
      vertical: FrameAnchorType.PAGE,
    },
  };
}

// Y positions (TWIP from top of page)
const Y = {
  banner: 400,
  catch1: 1000,
  catch2: 1600,
  fax: 2200,
  titleBlock: 3000,
  subtitle: 3700,
  author: 4100,
  prText: 4800,
  materials: 13200,
  badge: 13200,
  orderTable: 13800,
};

export async function generateWord(
  form: OrderFormData,
  salesData: SalesRow[]
) {
  // activeSales not used in current layout (sales data rendered via preview only)
  const isbn13 = normalizeIsbn(form.isbn);
  const bookSpecs = [
    form.size,
    form.pages ? form.pages + "頁" : "",
    form.price ? "本体" + form.price + "円" : "",
  ]
    .filter(Boolean)
    .join("\u3000");

  // Build children array with frame-positioned paragraphs
  const children: (Paragraph | Table)[] = [];

  // Banner - black bg, white text (fixed at top)
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: C(COLORS.bannerBg) },
      frame: frame(600, Y.banner, PAGE_W, 600),
      children: [
        new TextRun({
          text: `大和書房\u3000${form.doctype}`,
          size: S(SIZES.banner),
          color: C(COLORS.bannerText),
          font: FONTS.gothicUB,
        }),
      ],
    })
  );

  // Catch copy - black bg, yellow text (fixed)
  if (form.catchCopy) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        shading: { type: ShadingType.SOLID, color: C(COLORS.catchBg) },
        frame: frame(600, Y.catch1, PAGE_W, 600),
        children: [
          new TextRun({
            text: form.catchCopy,
            bold: true,
            size: S(SIZES.catchMain),
            color: C(COLORS.catchText),
            font: FONTS.gothicUB,
          }),
        ],
      })
    );
  }

  // Sub catch
  if (form.subCatch) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        shading: { type: ShadingType.SOLID, color: C(COLORS.catchBg) },
        frame: frame(600, Y.catch2, PAGE_W, 500),
        children: [
          new TextRun({
            text: form.subCatch,
            bold: true,
            size: S(SIZES.catchSub),
            color: C(COLORS.catchText),
            font: FONTS.gothicUB,
          }),
        ],
      })
    );
  }

  // FAX info (fixed)
  children.push(
    new Paragraph({
      frame: frame(600, Y.fax, PAGE_W, 700),
      children: [
        new TextRun({
          text: "大和書房営業部",
          bold: true,
          size: S(SIZES.faxLeft),
          font: FONTS.gothicUBP,
        }),
        new TextRun({ text: "\u3000\u3000", size: S(SIZES.faxLeft), font: FONTS.gothicUBP }),
        new TextRun({
          text: "FAX：",
          bold: true,
          size: S(SIZES.faxTag),
          font: FONTS.gothicUBP,
        }),
        new TextRun({
          text: "03-3207-8740 ",
          bold: true,
          size: S(SIZES.faxMain),
          font: FONTS.msGothic,
        }),
        new TextRun({
          text: "または 03-3207-8480",
          bold: true,
          size: S(SIZES.faxSub),
          font: FONTS.msGothic,
        }),
      ],
    })
  );

  // Title - green bg (fixed) with auto-sizing for long titles
  const titleSize =
    form.title.length > 35 ? 18 : form.title.length > 25 ? 24 : SIZES.title;
  children.push(
    new Paragraph({
      shading: { type: ShadingType.SOLID, color: C(COLORS.titleBlockBg) },
      frame: frame(600, Y.titleBlock, PAGE_W, 700),
      children: [
        new TextRun({
          text: form.title,
          bold: true,
          size: S(titleSize),
          color: C(COLORS.titleBlockText),
          font: FONTS.gothicUBP,
        }),
      ],
    })
  );

  // Subtitle - green bg (fixed)
  if (form.subtitle) {
    children.push(
      new Paragraph({
        shading: { type: ShadingType.SOLID, color: C(COLORS.titleBlockBg) },
        frame: frame(600, Y.subtitle, PAGE_W, 400),
        children: [
          new TextRun({
            text: form.subtitle,
            bold: true,
            size: S(SIZES.subtitle),
            color: C(COLORS.titleBlockText),
            font: FONTS.gothicUBP,
          }),
        ],
      })
    );
  }

  // Author + specs - green bg (fixed)
  children.push(
    new Paragraph({
      shading: { type: ShadingType.SOLID, color: C(COLORS.titleBlockBg) },
      frame: frame(600, Y.author, PAGE_W, 500),
      children: [
        ...(form.authorTitle
          ? [
              new TextRun({
                text: form.authorTitle + "\u3000",
                size: S(SIZES.authorTitle),
                color: C(COLORS.titleBlockText),
                font: FONTS.gothicUBP,
              }),
            ]
          : []),
        new TextRun({
          text: `${form.author}\u3000`,
          bold: true,
          size: S(SIZES.authorName),
          color: C(COLORS.titleBlockText),
          font: FONTS.gothicUBP,
        }),
        new TextRun({
          text: "著",
          size: S(SIZES.authorSuffix),
          color: C(COLORS.titleBlockText),
          font: FONTS.gothicUBP,
        }),
        new TextRun({
          text: `\u3000\u3000${bookSpecs}`,
          size: S(SIZES.specs),
          color: C(COLORS.titleBlockText),
          font: FONTS.gothicUBP,
        }),
      ],
    })
  );

  // PR text (fixed position)
  if (form.prText) {
    children.push(
      new Paragraph({
        frame: frame(600, Y.prText, PAGE_W, 2000),
        children: [
          new TextRun({
            text: form.prText,
            size: 20,
            font: FONTS.msGothic,
          }),
        ],
      })
    );
  }

  // Materials (fixed at bottom area)
  if (!form.hideMaterials) {
    children.push(
      new Paragraph({
        frame: frame(600, Y.materials, 5000, 600),
        children: [
          new TextRun({
            text: `拡材のご希望：\n${form.materialsText || "□A6POP\u3000\u3000□A4パネル（30冊以上）"}`,
            size: S(SIZES.materialsLabel),
            font: FONTS.gothicUB,
          }),
        ],
      })
    );
  }

  // Badge text (fixed at bottom right)
  if (form.badgeText) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        shading: { type: ShadingType.SOLID, color: C(COLORS.badgeBg) },
        frame: frame(5800, Y.badge, 5500, 600),
        children: [
          new TextRun({
            text: form.badgeText,
            bold: true,
            size: S(SIZES.badge),
            color: C(COLORS.badgeText),
            font: FONTS.gothicUBP,
          }),
        ],
      })
    );
  }

  // Order table (fixed at very bottom) - not framed, uses normal flow at end
  // Tables don't support frame, so we use spacer paragraphs to position
  // Actually, we add a framed spacer then the table flows after it
  children.push(
    new Paragraph({
      frame: frame(600, Y.orderTable, PAGE_W, 100),
      children: [new TextRun({ text: "" })],
    })
  );

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            "貴 店 印",
            "注文数",
            `大和書房\u3000${form.author}\u3000著`,
          ].map(
            (h) =>
              new TableCell({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: h, size: S(SIZES.orderHeader), font: FONTS.gothicUB }),
                    ],
                  }),
                ],
              })
          ),
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({ spacing: { after: 300 }, children: [] }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "ご担当者：\u3000\u3000\u3000\u3000\u3000\u3000様",
                      size: S(SIZES.orderContact),
                      font: FONTS.msGothic,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({ spacing: { after: 400 }, children: [] }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: form.title,
                      bold: true,
                      size: S(SIZES.orderTitle),
                      font: FONTS.gothicUBP,
                    }),
                  ],
                }),
                ...(form.subtitle
                  ? [
                      new Paragraph({
                        children: [
                          new TextRun({ text: form.subtitle, size: S(SIZES.orderBody), font: FONTS.gothicUBP }),
                        ],
                      }),
                    ]
                  : []),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `ISBN${isbn13}\u3000${form.price ? "本体" + form.price + "円" : ""}\u3000${form.pages ? form.pages + "頁" : ""}\u3000${form.size || ""}\u3000大和書房`,
                      size: S(SIZES.orderIsbn),
                      font: FONTS.msGothic,
                      color: "555555",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 400, bottom: 400, left: 600, right: 600 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `注文書_${form.title.slice(0, 20)}_${new Date().toISOString().slice(0, 10)}.docx`;
  saveAs(blob, filename);
}
