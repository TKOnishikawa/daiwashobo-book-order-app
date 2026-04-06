"use client";

import { useState } from "react";
import type { OrderFormData } from "@/types/book";
import { useBookMaster } from "@/hooks/useBookMaster";
import { useFormData } from "@/hooks/useFormData";
import IsbnLookup from "@/components/IsbnLookup";
import BookForm from "@/components/BookForm";
import SalesEditor from "@/components/SalesEditor";
import ActionBar from "@/components/ActionBar";
import OrderPreview from "@/components/OrderPreview";

export default function HomePage() {
  const { index, loading, count } = useBookMaster();
  const {
    form,
    setForm,
    updateField,
    salesData,
    setSalesData,
    updateSalesRow,
    addSalesRow,
    removeSalesRow,
    clearSales,
  } = useFormData();

  const [isbn, setIsbn] = useState("");
  const [status, setStatus] = useState<{
    type: "ok" | "err" | "";
    message: string;
  }>({ type: "", message: "" });
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  const handleBookFound = (updates: Partial<OrderFormData>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  return (
    <>
      <header className="app-header">
        <h1>注文書ジェネレーター</h1>
        <div className="sub">
          大和書房 営業部
          {loading
            ? "\u3000書籍マスタ読込中..."
            : `\u3000書籍マスタ: ${count.toLocaleString()}件`}
        </div>
      </header>

      <div className="container">
        <div className="app-grid">
          {/* Left: Form Panel */}
          <div className="form-panel">
            <h3>書籍情報入力</h3>
            <IsbnLookup
              isbn={isbn}
              index={index}
              onIsbnChange={setIsbn}
              onBookFound={handleBookFound}
              status={status}
              setStatus={setStatus}
            />
            <BookForm
              form={form}
              updateField={updateField}
              setForm={setForm}
              onHighlight={setHighlight}
              salesEditor={
                <>
                  <h3 style={{ marginTop: 20 }}>販売実績</h3>
                  <div className="form-group" onFocus={() => setHighlight("salesLabel")} onBlur={() => setHighlight(null)}>
                    <label>セクションタイトル</label>
                    <input
                      type="text"
                      value={form.salesLabel}
                      placeholder="初速販売実績"
                      onChange={(e) => updateField("salesLabel", e.target.value)}
                    />
                  </div>
                  <SalesEditor
                    salesData={salesData}
                    updateSalesRow={updateSalesRow}
                    addSalesRow={addSalesRow}
                    removeSalesRow={removeSalesRow}
                    clearSales={clearSales}
                    onHighlight={setHighlight}
                  />
                </>
              }
            />
            <ActionBar
              form={form}
              salesData={salesData}
              coverImage={coverImage}
              displayImage={displayImage}
              onRestore={(data) => {
                setForm(data.form);
                setSalesData(data.salesData);
                setCoverImage(data.coverImage || null);
                setDisplayImage(data.displayImage || null);
              }}
            />
          </div>

          {/* Right: Preview Panel */}
          <OrderPreview
            form={form}
            salesData={salesData}
            index={index}
            coverImage={coverImage}
            onCoverChange={setCoverImage}
            displayImage={displayImage}
            onDisplayChange={setDisplayImage}
            highlight={highlight}
          />
        </div>
      </div>
    </>
  );
}
