"use client";
import React from "react";

type Props = {
  products: any[];
  movements: any[];
};

export default function ExportButton({ products, movements }: Props) {
  const handleExport = async () => {
    const XLSX = await import('xlsx');

    const prodSheet = XLSX.utils.json_to_sheet(
      products.map(p => ({
        id: p.id,
        name: p.name,
        type: p.type ?? '',
        size: p.size ?? '',
        material: p.material ?? '',
        current_stock: p.current_stock ?? 0,
        low_stock_threshold: p.low_stock_threshold ?? 0,
      }))
    );

    const movSheet = XLSX.utils.json_to_sheet(
      movements.map(m => ({
        id: m.id,
        product_id: m.product_id,
        type: m.type,
        quantity: m.quantity,
        date: m.date,
        notes: m.notes ?? '',
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, prodSheet, 'Products');
    XLSX.utils.book_append_sheet(wb, movSheet, 'Movements');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eco-warehouse-export.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={handleExport} className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">
      יצא לאקסל
    </button>
  );
}
