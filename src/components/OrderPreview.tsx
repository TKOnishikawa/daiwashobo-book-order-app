"use client";

import { useMemo, useRef, useCallback, useState } from "react";
import type { OrderFormData, SalesRow, BookMasterRecord } from "@/types/book";
import { normalizeIsbn } from "@/lib/book-master";

const IS_DEV = process.env.NODE_ENV === "development";

// Default positions (matches CSS)
const DEFAULT_POSITIONS = {
  cover: { left: 0, top: 0, width: 239, height: 351 },
  display: { left: 527, top: 572, width: 124, height: 182 },
};

const DEFAULT_COL_WIDTHS = { stamp: 133, qty: 60 };

interface DragPos {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Props {
  form: OrderFormData;
  salesData: SalesRow[];
  index: Map<string, BookMasterRecord>;
  coverImage: string | null;
  onCoverChange: (url: string | null) => void;
  displayImage: string | null;
  onDisplayChange: (url: string | null) => void;
  highlight: string | null;
}

export default function OrderPreview({
  form,
  salesData,
  index,
  coverImage,
  onCoverChange,
  displayImage,
  onDisplayChange,
  highlight,
}: Props) {
  const isbn13 = normalizeIsbn(form.isbn);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const displayInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  // Dev drag mode
  const [dragMode, setDragMode] = useState(false);
  const [positions, setPositions] = useState<Record<string, DragPos>>({
    cover: { ...DEFAULT_POSITIONS.cover },
    display: { ...DEFAULT_POSITIONS.display },
  });
  const [colWidths, setColWidths] = useState({ ...DEFAULT_COL_WIDTHS });
  const dragRef = useRef<{
    key: string;
    startX: number;
    startY: number;
    origLeft: number;
    origTop: number;
  } | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      setCoords({ x, y });

      // Handle drag
      if (dragRef.current) {
        const { key, startX, startY, origLeft, origTop } = dragRef.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        setPositions((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            left: origLeft + dx,
            top: origTop + dy,
          },
        }));
      }
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setCoords(null);
    dragRef.current = null;
  }, []);

  const handleMouseUp = useCallback(() => {
    if (dragRef.current) {
      const key = dragRef.current.key;
      const pos = positions[key];
      console.log(
        `[DevDrag] ${key}: left:${pos.left}px; top:${pos.top}px; width:${pos.width}px; height:${pos.height}px;`
      );
      dragRef.current = null;
    }
  }, [positions]);

  const startDrag = useCallback(
    (key: string) => (e: React.MouseEvent) => {
      if (!dragMode) return;
      e.preventDefault();
      e.stopPropagation();
      const pos = positions[key];
      dragRef.current = {
        key,
        startX: e.clientX,
        startY: e.clientY,
        origLeft: pos.left,
        origTop: pos.top,
      };
    },
    [dragMode, positions]
  );

  // ISBN-based cover URL as fallback
  const isbnCoverUrl =
    isbn13.length === 13
      ? `https://www.books.or.jp/img/books_icon/${isbn13}.jpg`
      : "";

  const activeSales = useMemo(
    () => salesData.filter((s) => s.store),
    [salesData]
  );


  // Auto-fit ot-book-title based on character count
  const fullTitle = form.title + (form.subtitle ? " " + form.subtitle : "");
  const otAutoSize =
    fullTitle.length > 30 ? 0.85 :
    fullTitle.length > 25 ? 1.0 :
    fullTitle.length > 20 ? 1.2 :
    fullTitle.length > 15 ? 1.5 :
    1.92;

  // 新刊案内時は「本体」→「予価」、「注文数」→「予約数」に切替
  const isAdvance = form.doctype === "新刊案内";
  const priceLabel = isAdvance ? "予価" : "本体";
  const qtyLabel = isAdvance ? "予約数" : "注文数";

  const bookSpecs = [
    form.size,
    form.pages ? form.pages + "頁" : "",
    form.price ? priceLabel + form.price + "円+税" : "",
  ]
    .filter(Boolean)
    .join("\u3000");

  const bookData = index.get(isbn13) || index.get(form.isbn);
  const genre = bookData?.genre || "";

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onCoverChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDisplayUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onDisplayChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  const coverPos = positions.cover;
  const displayPos = positions.display;

  // Highlight helper: returns "hl-active" class when highlight matches any of the given areas
  const hl = (...areas: string[]) => areas.includes(highlight || "") ? " hl-active" : "";

  // CSS output for dev panel
  const cssOutput = dragMode
    ? `cover: left:${coverPos.left} top:${coverPos.top} ${coverPos.width}x${coverPos.height} | display: left:${displayPos.left} top:${displayPos.top} ${displayPos.width}x${displayPos.height}`
    : "";

  return (
    <div className="preview-wrapper">
      {/* Hidden file inputs */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleCoverUpload}
      />
      <input
        ref={displayInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleDisplayUpload}
      />

      {/* Dev drag mode toggle */}
      {IS_DEV && (
        <>
          <button
            className={`dev-drag-toggle ${dragMode ? "active" : ""}`}
            onClick={() => setDragMode((v) => !v)}
          >
            {dragMode ? "DRAG ON" : "DRAG OFF"}
          </button>
          {dragMode && (
            <div className="dev-css-panel">
              <div>{cssOutput}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 4, alignItems: "center" }}>
                <label style={{ fontSize: 11 }}>
                  貴店印: {colWidths.stamp}px
                  <input type="range" min={60} max={250} value={colWidths.stamp}
                    onChange={(e) => setColWidths((p) => ({ ...p, stamp: +e.target.value }))}
                    style={{ width: 100, marginLeft: 4, verticalAlign: "middle" }} />
                </label>
                <label style={{ fontSize: 11 }}>
                  注文数: {colWidths.qty}px
                  <input type="range" min={30} max={120} value={colWidths.qty}
                    onChange={(e) => setColWidths((p) => ({ ...p, qty: +e.target.value }))}
                    style={{ width: 80, marginLeft: 4, verticalAlign: "middle" }} />
                </label>
              </div>
            </div>
          )}
        </>
      )}

      <div
        className="preview-panel"
        ref={panelRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
      >
        {/* Coordinate crosshair + label */}
        {coords && (
          <>
            <div className="coord-h-line" style={{ top: coords.y }} />
            <div className="coord-v-line" style={{ left: coords.x }} />
            <div
              className="coord-label"
              style={{ left: coords.x + 10, top: coords.y - 20 }}
            >
              x:{coords.x} y:{coords.y}
            </div>
          </>
        )}
        <div className="of-content">
          {/* Black Banner */}
          <div className={`of-banner${hl("doctype")}`}>
            {form.genreTag && (
              <span className={`of-genre-tag${hl("genreTag")}`}>
                <svg className="genre-bg" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
                  <polygon
                    points="60,0 72,6 84,2 87,14 102,18 98,30 120,40 98,50 102,62 87,66 84,78 72,74 60,80 48,74 36,78 33,66 18,62 22,50 0,40 22,30 18,18 33,14 36,2 48,6"
                    fill="#fff" stroke="#000" strokeWidth="2.5"
                  />
                </svg>
                <span className="genre-text">
                  <span className="genre-name">{form.genreTag}</span>
                  <span className="genre-sub">ご担当者様</span>
                </span>
              </span>
            )}
            大和書房{"\u3000"}
            {form.doctype}
          </div>

          {/* Catch Copy - black bg, yellow text */}
          <div className="of-catch-banner">
            <div className={`of-catch-main${hl("catchCopy")}`}>{form.catchCopy || "\u3000"}</div>
            <div className={`of-catch-sub${hl("subCatch")}`}>{form.subCatch || "\u3000"}</div>
          </div>

          {/* FAX Row */}
          <div className="of-fax-row">
            <span className="fax-dept">大和書房営業部</span>
            <div className="fax-right">
              <div className="fax-line1">
                <span className="fax-label">FAX：</span>
                <span className="fax-main">03-3207-8740</span>
                <span className="fax-sub">{"\u3000"}または{"\u3000"}03-3207-8480</span>
              </div>
              <div className="fax-line2">BOOKインタラクティブからも注文できます</div>
            </div>
          </div>

          {/* Title Block - green background */}
          <div className="of-title-block">
            <div className={`of-title${hl("title")}`} style={{ fontSize: `${form.titleSize}rem`, transform: `translateY(${form.titleOffsetY}px)` }}>{form.title}</div>
            {form.subtitle && (
              <div className={`of-subtitle${hl("subtitle")}`} style={{ transform: `translateY(${form.titleOffsetY}px)` }}>{form.subtitle}</div>
            )}
            <div className="of-author-line">
              <span className={`author-info${hl("authorTitle", "authorName")}`}>
                {form.authorTitle && (
                  <span className="author-title">{form.authorTitle}</span>
                )}
                <span className="name">
                  {form.author ? form.author + "\u3000" : ""}
                </span>
                {form.author && <span className="author-suffix">著</span>}
              </span>
              <span className={`specs${hl("specs")}`}>{bookSpecs}</span>
            </div>
          </div>

          {/* Two Column Main Area */}
          <div className="of-main-area">
            {/* Left Column */}
            <div className="of-col-left">
              <div className="of-pr-text">{form.prText}</div>
            </div>

            {/* Right Column */}
            <div className="of-col-right">
              {/* Sales Section */}
              <div className={`of-sales-section${hl("sales", "salesLabel")}`}>
                <div className={`of-sales-header${hl("salesLabel")}`}>{form.salesLabel || "初速販売実績"}</div>
                <div className="of-sales-list">
                  {salesData.slice(0, 4).map((s, i) => (
                    <div className="of-sales-row" key={i}>
                      <span className="of-sales-store">{s.store || "\u3000"}</span>
                      {s.store ? (
                        <span className="of-sales-numbers">
                          {s.value}
                        </span>
                      ) : (
                        <span>{"\u3000"}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Promo Lines - wrapped to avoid overlap with display photo */}
              <div className="of-promo-wrap">
                {form.promoLine1 && (
                  <div className={`of-promo-line1${hl("promo1")}`}>{form.promoLine1}</div>
                )}
                {form.promoLine2 && (
                  <div className={`of-promo-line2${hl("promo2")}`}>{form.promoLine2}</div>
                )}
                {form.promoLine3 && (
                  <div className={`of-promo-line3${hl("promo3")}`}>{form.promoLine3}</div>
                )}
              </div>
            </div>
          </div>

          {/* Cover Image - absolutely positioned, draggable in dev mode */}
          <div
            className={`of-cover-container of-uploadable ${dragMode ? "dev-draggable" : ""}`}
            style={{
              left: coverPos.left,
              top: coverPos.top,
              width: coverPos.width,
              height: coverPos.height,
            }}
            onMouseDown={dragMode ? startDrag("cover") : undefined}
          >
            {coverImage ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverImage} alt="書影" />
                {!dragMode && (
                  <button
                    className="of-img-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCoverChange(null);
                      if (coverInputRef.current) coverInputRef.current.value = "";
                    }}
                  >
                    ×
                  </button>
                )}
              </>
            ) : (
              <label className="of-cover-label">
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => onCoverChange(reader.result as string);
                    reader.readAsDataURL(file);
                  }}
                />
                <span className="of-cover-placeholder">
                  クリックして
                  <br />
                  書影をアップロード
                </span>
              </label>
            )}
            {dragMode && (
              <div className="dev-drag-label">
                cover: ({coverPos.left}, {coverPos.top})
              </div>
            )}
          </div>

          {/* Display Image - absolutely positioned, draggable in dev mode */}
          <div
            className={`of-display-container of-uploadable ${dragMode ? "dev-draggable" : ""}`}
            style={{
              left: displayPos.left,
              top: displayPos.top,
              width: displayPos.width,
              height: displayPos.height,
            }}
            onClick={
              dragMode ? undefined : () => displayInputRef.current?.click()
            }
            onMouseDown={startDrag("display")}
          >
            {displayImage ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={displayImage} alt="展開写真" />
                {!dragMode && (
                  <button
                    className="of-img-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDisplayChange(null);
                      if (displayInputRef.current)
                        displayInputRef.current.value = "";
                    }}
                  >
                    ×
                  </button>
                )}
              </>
            ) : (
              <span className="of-display-placeholder">
                クリックして
                <br />
                展開写真をアップロード
              </span>
            )}
            {dragMode && (
              <div className="dev-drag-label">
                display: ({displayPos.left}, {displayPos.top})
              </div>
            )}
          </div>
        </div>
        {/* end of-content */}

        {/* Bottom fixed area */}
        <div className="of-bottom-fixed">
          <div className="of-materials-row">
            {!form.hideMaterials && (
              <div className={`of-materials-box${hl("materials")}`}>
                <div className="label">{form.materialsLabel || "拡材のご希望："}</div>
                <div>{form.materialsText || "□A6POP\u3000\u3000□A4パネル（30冊以上）"}</div>
              </div>
            )}
            {form.badgeText && (
              <div className={`of-reprint-badge${hl("badge")}`}>{form.badgeText}</div>
            )}
          </div>

          {/* Order Table - pinned to bottom */}
          <div className="of-order-section">
            <table className="of-order-table">
              <thead>
                <tr className="ot-header-row">
                  <th className="ot-header-stamp" colSpan={2} style={{ width: colWidths.stamp }}>
                    貴 店 印
                  </th>
                  <th className="ot-header-qty" style={{ width: colWidths.qty }}>{qtyLabel}</th>
                  <th className="ot-header-book">
                    大和書房｜{form.author ? form.author.replace(/\u3000+/g, "") + "\u3000著" : ""}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="ot-body-row">
                  <td className="ot-stamp-td" colSpan={2}>
                    <div className="ot-stamp-contact">
                      ご担当者：{"\u3000\u3000\u3000\u3000\u3000\u3000"}様
                    </div>
                  </td>
                  <td className="ot-qty-td"></td>
                  <td className="ot-book-td">
                    <div className="ot-book-title" style={{ fontSize: `${otAutoSize}rem` }}>{form.title.replace(/\u3000+/g, "")}</div>
                    {form.subtitle && (
                      <div className="ot-book-subtitle">{form.subtitle.replace(/\u3000+/g, "")}</div>
                    )}
                    <div className="ot-book-isbn">
                      ISBN{isbn13 ? isbn13 : ""}
                      {"\u3000"}
                      {form.price ? priceLabel + form.price + "円+税" : ""}
                      {"\u3000"}
                      {form.pages ? form.pages + "頁" : ""}
                      {"\u3000"}
                      {form.size || ""}
                      {"\u3000"}大和書房
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        {/* end of-bottom-fixed */}
      </div>
    </div>
  );
}
