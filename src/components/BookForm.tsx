"use client";

import type { OrderFormData } from "@/types/book";

interface Props {
  form: OrderFormData;
  updateField: (field: keyof OrderFormData, value: string) => void;
  setForm: React.Dispatch<React.SetStateAction<OrderFormData>>;
}

export default function BookForm({ form, updateField, setForm }: Props) {
  return (
    <>
      <div className="form-group">
        <label>書籍タイトル（サブタイトルが必要な場合は後ろに手動追加）</label>
        <textarea
          rows={2}
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-3)", whiteSpace: "nowrap" }}>文字サイズ: {form.titleSize}rem</span>
          <input
            type="range"
            min={0.8}
            max={3.5}
            step={0.1}
            value={form.titleSize}
            onChange={(e) => setForm((prev) => ({ ...prev, titleSize: parseFloat(e.target.value) }))}
            style={{ flex: 1 }}
          />
        </div>
      </div>
      <div className="form-group">
        <label>著者肩書き</label>
        <input
          type="text"
          value={form.authorTitle}
          placeholder="（株）COTEN 歴史調査チーム"
          onChange={(e) => updateField("authorTitle", e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>著者名</label>
        <input
          type="text"
          value={form.author}
          onChange={(e) => updateField("author", e.target.value)}
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>本体価格</label>
          <input
            type="number"
            value={form.price}
            onChange={(e) => updateField("price", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>判型</label>
          <select
            value={form.size}
            onChange={(e) => updateField("size", e.target.value)}
          >
            <option value="">--</option>
            <option value="四六判">四六判</option>
            <option value="A5判">A5判</option>
            <option value="B6判">B6判</option>
            <option value="新書判">新書判</option>
            <option value="文庫判">文庫判</option>
            <option value="文庫版">文庫版</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>ページ数</label>
        <input
          type="text"
          value={form.pages}
          onChange={(e) => updateField("pages", e.target.value)}
        />
      </div>

      <h3 style={{ marginTop: 20 }}>注文書情報</h3>
      <div className="form-group">
        <label>案内種別</label>
        <select
          value={form.doctype}
          onChange={(e) => updateField("doctype", e.target.value)}
        >
          <option value="重版案内">重版案内</option>
          <option value="新刊案内">新刊案内</option>
          <option value="フェア案内">フェア案内</option>
          <option value="季節商材案内">季節商材案内</option>
        </select>
      </div>
      <div className="form-group">
        <label>ジャンルタグ（ギザギザバッジ）</label>
        <input
          type="text"
          value={form.genreTag}
          placeholder="ビジネス書"
          onChange={(e) => updateField("genreTag", e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>バッジテキスト（黒帯）</label>
        <input
          type="text"
          value={form.badgeText}
          placeholder="3月13日重版出来"
          onChange={(e) => updateField("badgeText", e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>キャッチコピー（1行目）</label>
        <input
          type="text"
          value={form.catchCopy}
          placeholder="発売2週間で、3刷決定！！"
          onChange={(e) => updateField("catchCopy", e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>サブキャッチ（2行目）</label>
        <input
          type="text"
          value={form.subCatch}
          placeholder="（任意）"
          onChange={(e) => updateField("subCatch", e.target.value)}
        />
      </div>
      <h3 style={{ marginTop: 20 }}>プロモーション文</h3>
      <div className="form-group">
        <label>プロモ1（黄背景）</label>
        <input
          type="text"
          value={form.promoLine1}
          placeholder="初速良好！消化店続出！"
          onChange={(e) => updateField("promoLine1", e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>プロモ2（白背景）</label>
        <textarea
          rows={2}
          value={form.promoLine2}
          placeholder="都内大型店 地方都市&#10;私鉄沿線 で好調"
          onChange={(e) => updateField("promoLine2", e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>プロモ3（黄背景）</label>
        <textarea
          rows={2}
          value={form.promoLine3}
          placeholder="深井龍之介さんも&#10;大推薦！"
          onChange={(e) => updateField("promoLine3", e.target.value)}
        />
      </div>

      <h3 style={{ marginTop: 20 }}>販売実績</h3>
      <div className="form-group">
        <label>セクションタイトル</label>
        <input
          type="text"
          value={form.salesLabel}
          placeholder="初速販売実績"
          onChange={(e) => updateField("salesLabel", e.target.value)}
        />
      </div>

      <h3 style={{ marginTop: 20 }}>表示設定</h3>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem" }}>
        <input
          type="checkbox"
          checked={form.hideMaterials}
          onChange={(e) => setForm((prev) => ({ ...prev, hideMaterials: e.target.checked }))}
        />
        拡材のご希望を非表示
      </label>
      {!form.hideMaterials && (
        <div className="form-group" style={{ marginTop: 8 }}>
          <label>拡材テキスト</label>
          <input
            type="text"
            value={form.materialsText}
            placeholder="□A6POP　　□A4パネル（30冊以上）"
            onChange={(e) => updateField("materialsText", e.target.value)}
          />
        </div>
      )}
    </>
  );
}
