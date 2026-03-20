"use client";

import { useRef } from "react";
import type { OrderFormData, SalesRow } from "@/types/book";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface SaveData {
  form: OrderFormData;
  salesData: SalesRow[];
  coverImage: string | null;
  displayImage: string | null;
  savedAt: string;
}

interface Props {
  form: OrderFormData;
  salesData: SalesRow[];
  coverImage: string | null;
  displayImage: string | null;
  onRestore: (data: SaveData) => void;
}

export default function ActionBar({
  form,
  salesData,
  coverImage,
  displayImage,
  onRestore,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);


  const handlePdfSave = async () => {
    const panel = document.querySelector(".preview-panel") as HTMLElement;
    if (!panel) return;

    const devEls = panel.querySelectorAll(
      ".dev-drag-toggle, .dev-css-panel, .dev-drag-label, .coord-h-line, .coord-v-line, .coord-label"
    );
    devEls.forEach((el) => ((el as HTMLElement).style.display = "none"));

    const borderEls = panel.querySelectorAll(".of-order-table th, .of-order-table td");
    borderEls.forEach((el) => ((el as HTMLElement).style.borderWidth = "1px"));

    try {
      const canvas = await html2canvas(panel, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: panel.offsetWidth,
        height: panel.offsetHeight,
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      const imgData = canvas.toDataURL("image/png");

      if (imgHeight <= pdfHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      } else {
        const scale = pdfHeight / imgHeight;
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth * scale, pdfHeight);
      }

      pdf.save(`注文書_${form.title.slice(0, 20)}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      devEls.forEach((el) => ((el as HTMLElement).style.display = ""));
      borderEls.forEach((el) => ((el as HTMLElement).style.borderWidth = ""));
    }
  };

  // JSON保存（画像込み）
  const handleJsonSave = () => {
    const data: SaveData = {
      form,
      salesData,
      coverImage,
      displayImage,
      savedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `注文書_${form.title.slice(0, 20)}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // JSON読込
  const handleJsonLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as SaveData;
        if (data.form && data.salesData) {
          onRestore(data);
        }
      } catch {
        alert("JSONファイルの読み込みに失敗しました");
      }
    };
    reader.readAsText(file);
    // Reset so same file can be loaded again
    e.target.value = "";
  };

  return (
    <div className="action-bar">
<button className="btn-action btn-pdf" onClick={handlePdfSave}>
        PDF保存
      </button>
      <button className="btn-action btn-save" onClick={handleJsonSave}>
        保存
      </button>
      <button className="btn-action btn-load" onClick={() => fileInputRef.current?.click()}>
        読込
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={handleJsonLoad}
      />
    </div>
  );
}
