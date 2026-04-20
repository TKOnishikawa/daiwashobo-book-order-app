"use client";

import { useState, useCallback } from "react";
import type { OrderFormData, SalesRow } from "@/types/book";

const INITIAL_FORM: OrderFormData = {
  isbn: "9784479798446",
  title: "資本主義と、生きていく。",
  titleSize: 2.6,
  titleOffsetY: 0,
  subtitle: "",
  author: "品川皓亮",
  authorTitle: "",
  price: "1800",
  size: "四六判",
  pages: "312",
  doctype: "重版案内",
  hideMaterials: false,
  genreTag: "ビジネス書",
  badgeText: "\u3000\u3000\u30003月13日重版出来\u3000\u3000\u3000",
  catchCopy: "発売2週間で、3刷決定！！",
  subCatch: '私たちを追い込む"資本主義"との適切な距離感',
  promoLine1: "消化店続出！",
  promoLine2: "都内大型店, 地方都市, 私鉄沿線 で良好！",
  promoLine3: "深井龍之介さん推薦！",
  prText: "",
  salesLabel: "初速販売実績",
  materialsLabel: "拡材のご希望：",
  materialsText: "□A6POP\u3000\u3000□A4パネル（30冊以上）",
};

const INITIAL_SALES: SalesRow[] = [
  { store: "ジュンク堂書店池袋本店", value: "100冊入34冊売" },
  { store: "丸善丸の内本店", value: "100冊入31冊売" },
  { store: "紀伊國屋書店梅田本店", value: "100冊入31冊売" },
  { store: "紀伊國屋書店梅田本店", value: "100冊入31冊売" },
];

export function useFormData() {
  const [form, setForm] = useState<OrderFormData>(INITIAL_FORM);
  const [salesData, setSalesData] = useState<SalesRow[]>(INITIAL_SALES);

  const updateField = useCallback(
    (field: keyof OrderFormData, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const updateSalesRow = useCallback(
    (idx: number, field: keyof SalesRow, value: string) => {
      setSalesData((prev) =>
        prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
      );
    },
    []
  );

  const addSalesRow = useCallback(() => {
    setSalesData((prev) => [...prev, { store: "", value: "" }]);
  }, []);

  const removeSalesRow = useCallback((idx: number) => {
    setSalesData((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const clearSales = useCallback(() => {
    setSalesData([
      { store: "", value: "" },
      { store: "", value: "" },
      { store: "", value: "" },
      { store: "", value: "" },
    ]);
  }, []);

  return {
    form,
    setForm,
    updateField,
    salesData,
    setSalesData,
    updateSalesRow,
    addSalesRow,
    removeSalesRow,
    clearSales,
  };
}
