"use client";

import type { SalesRow } from "@/types/book";

interface Props {
  salesData: SalesRow[];
  updateSalesRow: (idx: number, field: keyof SalesRow, value: string) => void;
  addSalesRow: () => void;
  removeSalesRow: (idx: number) => void;
  clearSales: () => void;
}

export default function SalesEditor({
  salesData,
  updateSalesRow,
  clearSales,
}: Props) {
  return (
    <>
      <h3 style={{ marginTop: 20 }}>初速販売実績（4行固定）</h3>
      <div className="sales-editor">
        <table>
          <thead>
            <tr>
              <th>書店名</th>
              <th style={{ width: 70 }}>入数</th>
              <th style={{ width: 70 }}>売数</th>
            </tr>
          </thead>
          <tbody>
            {salesData.slice(0, 4).map((row, i) => (
              <tr key={i}>
                <td>
                  <input
                    value={row.store}
                    onChange={(e) => updateSalesRow(i, "store", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    value={row.stock}
                    onChange={(e) => updateSalesRow(i, "stock", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    value={row.sold}
                    onChange={(e) => updateSalesRow(i, "sold", e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="btn-row">
          <button className="btn-sm" onClick={clearSales}>
            クリア
          </button>
        </div>
      </div>
    </>
  );
}
