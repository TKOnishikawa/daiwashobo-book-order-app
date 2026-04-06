# v2-v3 開発ログ: クライアントFB対応 + Word出力全面改修 + UX改善 + マスタ品質改善

> **対象期間**: 2026-03-30（v2）〜 2026-04-06（v3）
> **コミット**: `9762b33` (v2), `06945f8` (v3 dx-projects), `bcb2867` (v3 ポータル)
> **v2 変更**: 30ファイル (+2826 -600)
> **v3 変更**: 13ファイル (+897 -689)

---

## 0. v2 改修内容（2026-03-30 / コミット `9762b33`）

v1公開後のクライアントフィードバックに基づく9項目の改修。

### バグ修正

| ID | 内容 | 原因 | 修正 |
|----|------|------|------|
| BUG-1 | 注文書最下部のISBN未反映 | `IsbnLookup`コンポーネントで`form.isbn`を更新していなかった | `onBookFound`で`isbn`フィールドも更新するよう修正 |

### 機能改修

| ID | 内容 | 実装詳細 |
|----|------|---------|
| F-1 | タイトル長文時の自動フォントサイズ縮小 | 文字数ベースの段階的縮小（15字以下→1.92rem、20字→1.5rem、25字→1.2rem、30字→1.0rem、30字超→0.85rem）。`otAutoSize`変数でCSS `fontSize`を動的設定 |
| F-2 | Word(.docx)出力ボタン追加 | `word-generator.ts`を新規作成。docxライブラリ + `framePr`方式で絶対座標配置。`ActionBar`にWord出力ボタンを追加 |
| F-3 | 書店入り/売り欄→フリーテキスト入力化 | `SalesRow`型を`{store, qty, sold}` → `{store, value}`に変更。入力UIを2列（書店名+実績自由入力）に。表示側も黄色ハイライトの自由テキスト表示に |
| F-4 | 販売実績セクションタイトル自由テキスト化 | `OrderFormData`に`salesLabel`フィールド追加（デフォルト「初速販売実績」）。入力欄とプレビューの`of-sales-header`に反映 |
| F-5 | 注文書タイプに「季節商材案内」追加 | `doctype`のselectオプションに追加（重版案内/新刊案内/フェア案内/季節商材案内） |
| F-6 | 拡材テキスト自由入力化 | `materialsText`フィールド追加。チェックボックスでの表示/非表示は維持しつつ、テキスト内容を自由入力可能に |
| F-7 | 副題デフォルトをブランクに | `INITIAL_FORM.subtitle`を空文字に変更。UIのplaceholderは「（任意）」表示 |
| F-9 | 5桁書籍コードでISBN検索対応 | `buildIsbnIndex`で`isbn13.substring(7,12)`の5桁コードもMapに登録。「79844」等の短縮入力で検索可能に |

### v2で追加された主要ファイル

| ファイル | 内容 |
|---------|------|
| `src/lib/word-generator.ts` | Word出力エンジン（framePr方式、v3で全面書き直し） |
| `src/lib/layout-constants.ts` | フォントサイズ・色・フォント名の一元定義（SIZES, COLORS, FONTS） |
| `src/app/v2/page.tsx` | 先行テスト用v2ルート（v3で削除） |
| `scripts/convert_master.py` | xlsx→book_master.json変換スクリプト |
| `docs/implementation-report.md` | v1実装レポート |
| `docs/specs/format-gap-analysis-v2.md` | docx XMLパースによるGAP分析 |
| `docs/plan/architecture-decisions.md` | ADR 3件（デプロイ先、永続化、Word生成方式） |
| `.github/workflows/deploy.yml` | GitHub Pages自動デプロイ |
| `CNAME` | カスタムドメイン（order.daiwashobo.omoshiku.jp） |

### v2時点のWord出力の制限

v2のWord出力はframePr（テキストフレーム絶対座標）方式で、以下が**未対応**だった:
- 書影・展開写真（画像配置不可）
- 販売実績セクション
- プロモーション文3行
- ジャンルバッジ（SVG→画像変換不可）
- 2カラムレイアウト
- BOOKインタラクティブ行

→ v3で全面書き直しにつながる。

---

## 1. v3 セッション概要（2026-04-06）

v2（9項目改修）の後、クライアントから「Wordで直接編集したい」という要件に対応。
ブラウザプレビューとWord出力の完全再現を目指して、word-generator.tsの全面書き直しを3回実施。
並行して書籍マスタの30文字切れ問題を発見・修正、入力フォームのUX改善を実施。

---

## 2. v3: Word出力の改修（3回の書き直し）

### 試行1: Frame方式 → Tableグリッド方式への移行

**問題**: 元の`framePr`方式ではテキストフレーム専用で、画像配置・2カラムレイアウトが不可能。

**アプローチ**: A4全体を1つの大テーブル（8行×2列）で構成。

```
Row 1: バナー（colspan全体、黒背景）
Row 2: キャッチ1（黒背景黄文字）
Row 3: キャッチ2（黒背景黄文字）
Row 4: FAX行（2セル: 営業部 | FAX+BOOK）
Row 5: タイトル（緑背景、colspan全体）
Row 6: 著者（緑背景）
Row 7: 左=書影+PR | 右=販売実績+プロモ+展開写真
Row 8: 拡材 + バッジ
Row 9: 注文テーブル（ネストTable）
```

**結果**: 構造は正しかったが、以下の問題が発生:
- 外枠テーブルの罫線が表示される → `borders: NO_BORDER_TABLE` で解消
- 書影が巨大すぎる → サイズ調整
- 注文テーブルが見切れる → 行高さ400に1800分詰込んでいた
- FAX番号が折り返し → フォントサイズ縮小

### 試行2: ユーザー修正版docxからの差分抽出

**手法**: ユーザーがWord上で手動調整した「修正版」docxを受け取り、PythonでXML解析して差分を抽出。

```python
# 比較スクリプトで行ごとの差分を自動検出
orig = extract_rows("(5).docx")
mod = extract_rows("(5) 修正.docx")
```

**検出した差分**:
| 項目 | 元 | ユーザー修正 |
|------|-----|-----------|
| バナー行高さ | 650 | 851 |
| バッジ画像サイズ | 70×47 | 61×41 |
| 販売実績フォントサイズ | 9pt | 16pt（倍増） |
| プロモLine1 | 14pt | 16pt |
| プロモLine2-3 | 11pt | 20pt |
| 書影 | inline 155×225 | anchor(wrapThrough) 269×391 |
| 展開写真 | inline 100×145 | anchor(wrapThrough) 192×209 |

### 試行3: floating画像の壊れたdocx問題 → JSZip後処理方式

**問題**: docxライブラリの`floating`オプション（`TextWrappingType.TIGHT`）を使うと、`wrapTight`に必須の`wrapPolygon`子要素が生成されず、**Wordで開けない壊れたファイル**になった。

**原因分析**:
```xml
<!-- 壊れたXML: wrapPolygonが無い -->
<wp:wrapTight distT="0" distB="0"/>

<!-- 正しいXML: wrapPolygonが必須 -->
<wp:wrapTight distT="0" distB="0">
  <wp:wrapPolygon edited="0">
    <wp:start x="0" y="0"/>
    <wp:lineTo x="0" y="21600"/>
    ...
  </wp:wrapPolygon>
</wp:wrapTight>
```

**解決策**: 2段階方式を採用。
1. docxライブラリでは**inline画像**として生成（壊れない）
2. `Packer.toBlob()` 後にJSZipでdocxを展開
3. `document.xml` 内の `wp:inline` を正規表現で検出
4. 画像サイズ（EMU値）でバッジ/書影/展開写真を判別
5. 書影・展開写真は `wp:anchor` + `wrapThrough` + `wrapPolygon`（矩形）に変換
6. バッジは `wp:anchor` + `wrapNone`（前面）に変換
7. 再ZIP化して出力

```typescript
async function patchInlineToAnchor(blob: Blob): Promise<Blob> {
  const zip = await JSZip.loadAsync(blob);
  const docXml = await zip.file("word/document.xml")!.async("string");
  // ... 正規表現で wp:inline を検出・変換
  zip.file("word/document.xml", patched);
  return await zip.generateAsync({ type: "blob", ... });
}
```

**教訓**:
- docxライブラリは`wrapTight`/`wrapThrough`のpolygon生成に非対応
- JSZip後処理はdocxライブラリの制約を回避する有効な手段
- EMU値（1pt = 9525 EMU）での画像サイズ判別は信頼性が高い

---

## 3. v3: 書籍マスタの30文字切れ問題

### 発見経緯

ユーザーが `9784479795971` を検索 →「売れる営業」がやっていること　「売れない営業」がやらかして**いること** の末尾が切れている。

### 原因調査

```python
# Excelのタイトル列を分析
count_30 = 0  # ちょうど30文字のタイトル数
for row in ws.iter_rows():
    if len(title) == 30:
        count_30 += 1
# 結果: 29件がちょうど30文字 → Excelエクスポート時の切り捨て
```

新旧両方のExcel（0313版、0325版）で同様の切り捨てが発生 → 元の在庫管理システム側の制限。

### 対応

**openBD API**（国立国会図書館連携、無料・認証不要）でISBNから正式タイトルを取得して補完。

```python
def fetch_openbd_titles(isbns: list[str]) -> dict[str, str]:
    url = f"https://api.openbd.jp/v1/get?isbn={','.join(isbns)}"
    # 1リクエスト最大1000件、バッチ処理
```

**結果**: 22件中11件を自動修正。3件はopenBD未登録。

**convert_master.pyの改修内容**:
- `min_row=2` → `min_row=3`（0325版はヘッダー行がRow 2）
- `int(row[4])` → `int(float(str(row[4])))`（price列がfloat）
- openBD補完ロジック追加（30文字以上のタイトルを検出→API照合→補完）

---

## 4. v3: UX改善

### フォーム並び順の最適化

**Before**: タイトル→著者→価格→案内種別→ジャンルタグ→バッジ→キャッチ→プロモ→販売実績→拡材
**After**: プレビューの上→下に完全対応。5セクション構成。

**実装**: BookFormコンポーネントを全面書き直し。SalesEditorをBookForm内の「コンテンツ」セクションに移動（`salesEditor` propsとして注入）。

### フォーカス連動ハイライト

**仕組み**:
1. `page.tsx` に `highlight: string | null` state追加
2. BookFormの各入力グループを `<HL area="xxx">` ラッパーで囲む
3. `onFocus` → `setHighlight("xxx")`、`onBlur` → `setHighlight(null)`
4. OrderPreviewの各要素に `className={...hl("xxx")}` を適用
5. CSS: `.hl-active { outline: 4px solid rgba(239, 68, 68, 0.7) !important; }`

**ピンポイントマッピング（18箇所）**: 案内種別→バナー、ジャンルタグ→バッジ、キャッチ→キャッチ行、タイトル→タイトル部分、プロモ1→プロモ1行...のように1対1対応。

### 注文テーブル内の全角スペース除去

タイトルフィールドに手動で全角スペースを入れて改行位置を調整 → 注文テーブル側では `.replace(/\u3000+/g, "")` で自動除去。タイトル・副題・著者名すべてに適用。

---

## 5. v3: 行高さ・サイズの最終値

### 外枠テーブル行高さ（TWIP）

| Row | 内容 | 高さ | rule |
|-----|------|------|------|
| 0 | バナー | 851 | exact |
| 1 | キャッチ | 550 | exact |
| 2 | サブキャッチ | 450 | exact |
| 3 | FAX | 700 | exact |
| 4 | タイトル（緑） | 1686 | exact |
| 5 | 著者（緑） | 718 | exact |
| 6 | メインコンテンツ | 7519 | exact |
| 7 | 拡材+バッジ | 450 | exact |
| 8 | 注文テーブル | 1820 | exact |
| **合計** | | **14744** | |

### 画像サイズ（pt / EMU）

| 画像 | pt | EMU | wrap |
|------|-----|------|------|
| バッジ | 137×92 | 1308100×878840 | wrapNone（前面） |
| 書影 | 269×391 | 2562225×3724275 | wrapThrough（内部） |
| 展開写真 | 192×209 | 1828800×1990725 | wrapThrough（内部） |

### フォントサイズ（販売実績・プロモ）

| 要素 | v2のpt | v3のpt | 理由 |
|------|--------|--------|------|
| 販売実績ヘッダー | 10 | 18 | ユーザー修正版に合わせて倍増 |
| 販売実績行（店名+値） | 9 | 16 | 同上 |
| プロモLine1 | 14 | 16 | 同上 |
| プロモLine2-3 | 11 | 20 | 同上 |

---

## 6. v3: ファイル変更一覧

| ファイル | 変更内容 |
|---------|--------|
| `src/lib/word-generator.ts` | 全面書き直し（Frame→Tableグリッド+JSZip後処理） |
| `src/components/ActionBar.tsx` | generateWordに画像引数追加、ボタンラベル変更 |
| `src/components/BookForm.tsx` | プレビュー順セクション構成、HL(フォーカスハイライト) |
| `src/components/OrderPreview.tsx` | highlight prop、hl()関数、ピンポイントマッピング |
| `src/components/SalesEditor.tsx` | onHighlight prop追加 |
| `src/app/page.tsx` | highlight state、salesEditorをBookForm内に移動 |
| `src/app/globals.css` | .hl-active スタイル追加 |
| `src/hooks/useFormData.ts` | titleSize初期値、authorTitle空文字 |
| `src/types/book.ts` | titleSize field追加 |
| `src/lib/book-master.ts` | コメント修正 |
| `public/book_master.json` | 0325版+openBD補完で再生成（1154件） |
| `scripts/convert_master.py` | min_row修正、float対応、openBD補完追加 |
| `src/app/v2/page.tsx` | 削除（メインに統合） |

---

## 7. 未解決・今後の課題

| 課題 | 詳細 | 優先度 |
|------|------|:---:|
| Word出力のレイアウト精度 | Tableグリッド方式の限界。PDFを推奨とし、Word深追いしない方針 | 低 |
| openBD未登録3件のタイトル | 手動補完が必要 | 低 |
| book_masterの定期更新 | 四半期Excel取込+openBD補完の運用フロー未整備 | 中 |
| カスタムドメイン | order.daiwashobo.omoshiku.jp のDNS設定 | 中 |
