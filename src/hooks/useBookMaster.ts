"use client";

import { useState, useEffect, useRef } from "react";
import type { BookMasterRecord } from "@/types/book";
import { buildIsbnIndex } from "@/lib/book-master";

export function useBookMaster() {
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const indexRef = useRef<Map<string, BookMasterRecord>>(new Map());

  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    fetch(`${basePath}/book_master.json`)
      .then((r) => r.json())
      .then((records: BookMasterRecord[]) => {
        indexRef.current = buildIsbnIndex(records);
        setCount(records.length);
        setLoading(false);
      })
      .catch((e) => {
        console.error("書籍マスタ読込失敗:", e);
        setLoading(false);
      });
  }, []);

  return { index: indexRef.current, loading, count };
}
