"use client";

import { useRef, useCallback, useEffect } from "react";
import type { BookMasterRecord, OrderFormData } from "@/types/book";
import { lookupByIsbn } from "@/lib/book-master";

interface Props {
  isbn: string;
  index: Map<string, BookMasterRecord>;
  onIsbnChange: (isbn: string) => void;
  onBookFound: (updates: Partial<OrderFormData>) => void;
  status: { type: "ok" | "err" | ""; message: string };
  setStatus: (s: { type: "ok" | "err" | ""; message: string }) => void;
}

export default function IsbnLookup({
  isbn,
  index,
  onIsbnChange,
  onBookFound,
  status,
  setStatus,
}: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doLookup = useCallback(
    (raw: string) => {
      if (!raw.trim()) {
        setStatus({ type: "", message: "" });
        return;
      }
      const book = lookupByIsbn(index, raw);
      if (book) {
        const updates: Partial<OrderFormData> = {
          isbn: book.isbn13,
          title: book.title,
          author: book.author,
          price: book.price,
        };
        if (book.size) updates.size = book.size;
        if (book.pages) updates.pages = book.pages;
        onBookFound(updates);
        setStatus({
          type: "ok",
          message: `${book.title} / ${book.author || "(著者不明)"}`,
        });
      } else if (raw.replace(/[^0-9]/g, "").length >= 5) {
        setStatus({ type: "err", message: "マスタに該当なし（手入力してください）" });
      } else {
        setStatus({ type: "", message: "" });
      }
    },
    [index, onBookFound, setStatus]
  );

  // Auto-lookup on mount if isbn is pre-filled
  const initialRef = useRef(false);
  useEffect(() => {
    if (!initialRef.current && isbn && index.size > 0) {
      initialRef.current = true;
      doLookup(isbn);
    }
  }, [isbn, index, doLookup]);

  const handleInput = useCallback(
    (value: string) => {
      onIsbnChange(value);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => doLookup(value), 400);
    },
    [onIsbnChange, doLookup]
  );

  return (
    <div className="form-group">
      <label>ISBN / 5桁コード（入力で自動検索）</label>
      <div className="isbn-row">
        <input
          type="text"
          value={isbn}
          placeholder="9784479... または 5桁コード"
          onChange={(e) => handleInput(e.target.value)}
        />
        <button className="btn-lookup" onClick={() => doLookup(isbn)}>
          検索
        </button>
      </div>
      {status.message && (
        <div className={`isbn-status ${status.type}`}>{status.message}</div>
      )}
    </div>
  );
}
