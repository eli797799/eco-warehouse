"use client";
import React from "react";

type ItemWithStock = {
  id: string;
  name: string;
  unit_type: string;
  min_stock: number;
  current_stock: number;
  barcode?: string;
  sku?: string;
};

type Props = {
  items: ItemWithStock[];
};

export default function ExportButton({ items }: Props) {
  const handleExport = () => {
    // Create CSV content
    const headers = ['שם הפריט', 'מלאי נוכחי', 'יחידת מידה', 'סף אזהרה', 'ברקוד', 'מק"ט'];
    const rows = items.map(item => [
      item.name,
      item.current_stock.toString(),
      item.unit_type,
      item.min_stock.toString(),
      item.barcode || '',
      item.sku || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Add BOM for Hebrew support in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <button 
      onClick={handleExport} 
      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-white font-semibold hover:from-emerald-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200"
    >
      📊 ייצא לאקסל (CSV)
    </button>
  );
}
