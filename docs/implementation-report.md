# 注文書ジェネレーター 実装レポート

> **作成日**: 2026-03-19
> **プロジェクト**: 大和書房 書店向け注文書自動生成アプリ
> **リポジトリ**: TKOnishikawa/daiwashobo-book-order-app
> **本番URL**: https://tkonishikawa.github.io/daiwashobo-book-order-app/

---

## 1. プロジェクト概要

### 目的
大和書房 営業部が書店向け注文書（重版・新刊案内）を、ISBN入力→自動補完→PDF出力の流れでブラウザから即座に生成できるようにする。

### 成果物
| 機能 | 状態 |
|------|------|
| ISBN検索→自動入力（1346件マスタ） | 完成 |
| A4リアルタイムプレビュー（実物フォーマット準拠） | 完成 |
| PDF保存（html2canvas + jsPDF） | 完成 |
| JSON保存/読込（画像Base64込み完全復元） | 完成 |
| 書影/展開写真アップロード | 完成 |
| Dev用ドラッグモード（位置・列幅調整） | 完成 |
| GitHub Pages デプロイ | 完成 |

### 技術スタック
- Next.js 16（静的エクスポート）+ React 19
- html2canvas + jsPDF（PDF生成）
- GitHub Pages（ホスティング、$0）
- サーバーレス完結（バックエンド・DB不要）

---

## 2. 実装の流れ（時系列）

### Phase 0: 要件定義・設計（2026-03-19 前半）
1. 既存プロトタイプのコード棚卸し（8コンポーネント、80%完成状態）
2. 実物注文書サンプル4種8ページとの突合 → 10件のGAP検出
3. docxファイルのXMLパースによるフォント・サイズの正確な抽出
4. Sprint分解（Sprint 0: フォーマット修正、Sprint 1: 保存機能、Sprint 2: 運用化）
5. ADR 3件作成（デプロイ先、データ永続化、Word生成方式）

### Phase 1: ブラウザプレビューの実物再現
1. バナー: 緑→黒背景に変更
2. キャッチコピー: 黄色背景→黒背景黄色文字（2行対応: catchCopy + subCatch）
3. タイトルブロック: 白背景→緑背景に変更、タイトル・サブタイトル・著者行を統合
4. FAX行: 「大和書房営業部」を黒背景白抜きボックス化、FAX番号の右寄せ
5. ジャンルタグ: SVGギザギザ楕円バッジ（clip-path→SVG方式に変更）
6. 販売実績: テーブル→divリスト形式（書店名 + 黄ハイライト赤文字「100冊入34冊売」）
7. プロモ文: 3ブロック（黄/白/黄の交互背景）
8. 拡材: 非表示チェックボックス対応
9. バッジテキスト: 自由入力（黒背景白文字）
10. 下部固定エリア: `position: absolute; bottom: 0` で入力内容に関わらず位置固定

### Phase 2: PDF出力
1. A方式（@media print CSS）: 背景色が消える・位置ズレ問題 → 品質20点
2. B方式（html2canvas + jsPDF）: ほぼ100%再現 → 採用
3. ジャンルタグの黒塗り問題: clip-path→SVG方式に変更して解決
4. テーブル罫線の太さ問題: キャプチャ時に一時的に1pxに変更

### Phase 3: データ保存・復元
1. JSON DL/UL方式を採用（画像Base64込み）
2. localStorage ではなくファイルベース → 容量制限なし、PC間移動可能

### Phase 4: マスタ切替・デプロイ
1. 新マスタ（1346件）への切替（xlsx→JSON変換スクリプト）
2. ISBN 5桁コード→ISBN13自動補完
3. GitHub Pages デプロイ（静的エクスポート + GitHub Actions）

---

## 3. 試行錯誤の記録

### 3-1. 書影アップロードが反映されない問題

**症状**: ファイル選択ダイアログは開くが、画像が表示されない

**原因の変遷**:
1. 最初は `useCallback` のクロージャ問題を疑った → メモ化を外して直接関数に変更
2. それでも治らず → `effectiveCoverUrl`（ISBN自動取得URL）の `onError` で `display: none` にした後、アップロード画像が来ても表示が戻らない問題を発見
3. 最終的に `<label>` + inline `<input type="file">` に変更して解決

**教訓**: ref経由の `click()` 転送は、絶対位置要素やドラッグモードと競合しやすい。`<label>` でネイティブのクリック伝搬を使う方が確実。

### 3-2. PDF出力のジャンルタグ黒塗り問題

**症状**: html2canvas でキャプチャすると、ギザギザバッジが真っ黒に

**原因**: `clip-path` + `::before`/`::after` 疑似要素が html2canvas で正しくレンダリングされない

**試行**:
1. `pdf-safe` クラスで一時的に楕円に切り替え → ギザギザが消えてしまう
2. SVGの `<polygon>` で描画する方式に変更 → html2canvas でも正しくレンダリングされた

**教訓**: html2canvas は `clip-path` と疑似要素に弱い。複雑な図形はSVGで描画する。

### 3-3. position: absolute の位置ズレ

**症状**: グリッドの列幅やgap を変更すると、書影の位置がズレる

**原因**: 書影は `of-content` に対する `position: absolute` で配置。グリッドの構造変更で `of-content` 内のフロー高さが変わり、相対位置がズレた。

**対策**: DRAG ON モードで座標を確認 → DEFAULT_POSITIONS とCSS を同時に更新。グリッド変更のたびに再調整が必要。

**教訓**: 絶対配置要素が多いレイアウトでは、フロー変更の影響範囲を事前に確認する。

### 3-4. @media print vs html2canvas

**比較結果**:
| 観点 | @media print (A) | html2canvas (B) |
|------|-----------------|----------------|
| 背景色 | ブラウザ設定依存（消える） | 100%再現 |
| レイアウト | 位置ズレ大 | ほぼ完全再現 |
| テキスト品質 | ベクター（くっきり） | ラスター（scale:2で十分） |
| ファイルサイズ | 小（50-100KB） | 中（500KB-1MB） |
| 実装コスト | 高（CSS調整多数） | 低（ライブラリ呼ぶだけ） |

**結論**: B方式一択。A方式は背景色問題の根本解決が難しい。

---

## 4. 工夫ポイント

### 4-1. Dev用ドラッグモード
- DRAG ON/OFF で書影・展開写真の位置をドラッグ調整
- テーブル列幅のスライダー調整
- 座標値がリアルタイムで表示される → 値を確定したらコードに反映

### 4-2. JSON保存/読込（画像込み）
- `FileReader.readAsDataURL()` で画像をBase64文字列に変換
- JSONファイルに全データ（フォーム値 + 販売実績 + 画像）を格納
- PC間でのデータ移動が可能（サーバー不要）
- クライアントに送って確認してもらうこともできる

### 4-3. pt基準のサイズ統一（layout-constants.ts）
- フォントサイズをpt基準で一元定義
- CSS（rem変換）とWord出力（docx size変換）が同じ定数を参照
- ブラウザとWord出力のサイズ差を根本解決

### 4-4. basePath の環境分岐
- `next.config.js` で `NODE_ENV` に応じて basePath を切替
- ローカル dev: basePath なし
- 本番（GitHub Pages）: `/daiwashobo-book-order-app`
- `book_master.json` のfetchパスも連動

### 4-5. ISBN 5桁コードの自動補完
- 大和書房の出版者コード `9784479` が固定
- マスタの書誌コード（5桁）+ チェックデジット（1桁）→ ISBN13（13桁）を自動生成
- ハイフン有り/無しどちらでも検索可能

### 4-6. 下部固定エリア
- `position: absolute; bottom: 0` で注文テーブル・拡材・バッジを常にA4の底に配置
- 上部のコンテンツ量が変わっても位置が動かない

---

## 5. 今後の別フォーマット構築時に活かせるポイント

### 5-1. 実物サンプルとの突合プロセス
```
実物PDF/docx入手 → docxのXMLパース（フォント・サイズ正確抽出）
→ 要素ごとのGAP分析表作成 → 優先度マトリクス → Sprint分解
```
- **docxのXMLパースが最も正確**。目視だけでは色やサイズの微妙な違いを見逃す
- GAP分析は「影響度 × 実装コスト」のマトリクスで優先順位付け

### 5-2. プレビュー→PDF の最適パターン
```
ブラウザプレビュー（CSS/HTML）→ html2canvas（scale:2）→ jsPDF（A4）
```
- @media print は背景色問題が根本的に解決困難
- html2canvas + jsPDF が現時点で最も再現度が高い
- `clip-path` は使わず **SVG** で図形を描画する
- テーブル罫線はキャプチャ時に一時的に細くする

### 5-3. フォーム設計のパターン
| パターン | 用途 |
|---------|------|
| `input type="text"` | 1行テキスト（タイトル、著者名等） |
| `textarea` | 複数行テキスト（プロモ文等） |
| `select` | 固定選択肢（判型、案内種別等） |
| `checkbox` | 表示/非表示トグル（拡材等） |
| ISBN検索 | debounce 400ms + マスタ照合 → 自動入力 |

### 5-4. 絶対配置要素の管理パターン
```typescript
const DEFAULT_POSITIONS = {
  cover: { left: 0, top: -387, width: 239, height: 351 },
  display: { left: 527, top: 572, width: 124, height: 182 },
};
```
- CSS と React state の**両方に同じ値を持つ**
- Dev用ドラッグモードで調整 → 値をコードに反映
- グリッド構造を変更するたびに再調整が必要（これが最大の課題）

### 5-5. マスタ変換パターン
```
クライアントからxlsx受領 → Python変換スクリプト → public/xxx.json → ブラウザでfetch
```
- xlsxを直接読まず、JSONに変換して`public/`に配置
- 変換時に正規化（全角→半角、フォーマット変換、不要カラム除外）
- 変換スクリプトをリポジトリに含めておく → マスタ更新時に再実行可能

### 5-6. デプロイパターン
```
git push → GitHub Actions → Next.js build (output: "export") → GitHub Pages
```
- Private リポ → Vercel（無料枠）
- Public リポ → GitHub Pages（無料）
- basePath の環境分岐を忘れない

### 5-7. データ永続化パターン
```
JSON DL/UL > localStorage > IndexedDB
```
- **JSON DL/UL が最もシンプルで確実**
- 画像はBase64でJSON内に埋込
- サーバー不要、PC間移動可能
- localStorage は容量制限（5-10MB）があるため画像込みには不向き

---

## 6. 技術的負債・未対応事項

| 項目 | 状態 | 対応時期 |
|------|------|---------|
| Word出力（docx） | Frame絶対配置まで実装したが品質不十分で一時削除 | 要再設計 |
| 新刊案内フォーマット | 未対応（メ切、配本予定、初版部数フィールド） | Phase 2 |
| フェア案内フォーマット | 未対応（セット販売、テーブル形式） | Phase 2 |
| 関連書籍「こちらもおススメ」 | 未対応（2冊レイアウト） | Phase 2 |
| 書籍マスタ自動更新 | 手動（xlsx→JSON変換スクリプト） | Phase 2 |
| kintone連携 | 未着手 | Phase 3 |

---

## 7. ファイル構成

```
daiwashobo-book-order-app/
├── .github/workflows/deploy.yml   # GitHub Pages 自動デプロイ
├── docs/
│   ├── specs/                      # 仕様書・GAP分析
│   ├── plan/                       # ADR・レビュー文書
│   └── implementation-report.md    # 本ファイル
├── public/
│   └── book_master.json            # 書籍マスタ（1346件）
├── scripts/
│   └── convert_master.py           # xlsx→JSON変換
├── src/
│   ├── app/
│   │   ├── globals.css             # 全スタイル（プレビュー・印刷・Dev UI）
│   │   ├── layout.tsx
│   │   └── page.tsx                # メインページ（state管理）
│   ├── components/
│   │   ├── ActionBar.tsx           # PDF保存・JSON保存/読込ボタン
│   │   ├── BookForm.tsx            # 入力フォーム
│   │   ├── IsbnLookup.tsx          # ISBN検索（debounce付き）
│   │   ├── OrderPreview.tsx        # A4プレビュー（全レイアウト）
│   │   └── SalesEditor.tsx         # 販売実績入力（4行固定）
│   ├── hooks/
│   │   ├── useBookMaster.ts        # マスタ読込・インデックス構築
│   │   └── useFormData.ts          # フォームstate管理
│   ├── lib/
│   │   ├── book-master.ts          # ISBN正規化・検索ロジック
│   │   ├── layout-constants.ts     # pt基準サイズ定義・変換関数
│   │   └── word-generator.ts       # Word出力（現在未使用）
│   └── types/
│       └── book.ts                 # 型定義
├── next.config.js                  # 静的エクスポート + basePath
├── package.json
└── tsconfig.json
```
