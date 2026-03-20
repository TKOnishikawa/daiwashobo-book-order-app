"""xlsx マスタ → book_master.json 変換スクリプト"""
import sys, io, json, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

import openpyxl

INPUT = r"c:\Users\takao\Downloads\0313在庫+直近１年実績表（正）.xlsx"
OUTPUT = r"c:\Users\takao\OneDrive\ドキュメント\GitHub\dx-projects\clients\daiwashobo\book-order-app\public\book_master.json"

PREFIX = "97844790"  # 大和書房の出版者コード

# 全角→半角変換テーブル
ZEN2HAN = str.maketrans("０１２３４５６７８９ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ",
                         "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ")

def normalize_size(raw: str) -> str:
    if not raw:
        return ""
    s = raw.translate(ZEN2HAN).strip()
    # 文庫A6判 → 文庫版
    if "文庫" in s and "6" in s:
        return "文庫版"
    return s

def normalize_author(raw: str) -> str:
    if not raw:
        return ""
    # 半角スペース削除（氏名間）
    return raw.replace(" ", "").strip()

def main():
    wb = openpyxl.load_workbook(INPUT, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]

    records = []
    for i, row in enumerate(ws.iter_rows(min_row=2, values_only=True)):
        code = str(row[0] or "").strip()
        check = str(row[1] or "").strip()
        title = str(row[2] or "").strip()
        author = normalize_author(str(row[3] or ""))
        price = str(int(row[4])) if row[4] else ""
        size = normalize_size(str(row[41] or ""))  # 版型1 = col AR (index 41)
        pages = str(int(row[48])) if row[48] else ""  # ページ数 = col AW (index 48)
        genre = str(row[51] or "").strip()  # 商品分類 = col AZ (index 51)

        if not code or not title:
            continue

        # ISBN13 = prefix(8) + code(5) + check(1)
        isbn13 = PREFIX + code.zfill(5) + check

        if len(isbn13) != 14:
            # Validate: should be 13 digits + 1 check
            # Actually 8 + 5 + 1 = 14? No, 97844790 is 8 chars + 5 + 1 = 14.
            # Wait: 978-4-479-XXXXX-C = 13 digits total
            # 97844790 = 8 digits, code = 5 digits, check = 1 digit = 14 digits
            # That's 14, not 13. Let me recalculate.
            # 978 (3) + 4 (1) + 479 (3) + XXXXX (5) + C (1) = 13
            # So prefix should be 9784479 (7 digits) not 97844790 (8 digits)
            pass

        # Recalculate: 978-4-479 = 7 digits, then code(5) + check(1) = 13 total
        isbn13 = "9784479" + code.zfill(5) + check

        if len(isbn13) != 13:
            print(f"WARN: Row {i+2} ISBN length {len(isbn13)}: {isbn13} (code={code}, check={check})")
            continue

        records.append({
            "isbn13": isbn13,
            "title": title,
            "author": author,
            "price": price,
            "genre": genre,
            "size": size,
            "pages": pages,
        })

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False)

    print(f"Converted {len(records)} records → {OUTPUT}")

if __name__ == "__main__":
    main()
