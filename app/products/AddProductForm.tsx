"use client";
import React, { useState } from "react";
import supabase from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

type Props = {
  onClose?: () => void;
};

export default function AddProductForm({ onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [size, setSize] = useState("");
  const [material, setMaterial] = useState("");
  const [category, setCategory] = useState("finished_product");
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [lowThreshold, setLowThreshold] = useState<number>(0);
  const [weightPerUnit, setWeightPerUnit] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.from('products').insert([{
        name,
        type,
        size,
        material,
        category,
        current_stock: currentStock,
        low_stock_threshold: lowThreshold,
        weight_per_unit: weightPerUnit || null,
      }]);
      if (error) throw error;
      setName(""); setType(""); setSize(""); setMaterial(""); setCurrentStock(0); setLowThreshold(0); setWeightPerUnit(0);
      if (onClose) onClose();
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? 'שגיאה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border p-4 bg-white">
      <div>
        <label className="block text-sm font-medium">שם מוצר</label>
        <input required value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-md border px-2 py-1" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium">קטגוריה</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full rounded-md border px-2 py-1">
            <option value="raw_material">חומר גלם</option>
            <option value="finished_product">מוצר סופי</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">סוג</label>
          <input value={type} onChange={e => setType(e.target.value)} className="mt-1 w-full rounded-md border px-2 py-1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium">גודל</label>
          <input value={size} onChange={e => setSize(e.target.value)} className="mt-1 w-full rounded-md border px-2 py-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">חומר</label>
          <input value={material} onChange={e => setMaterial(e.target.value)} className="mt-1 w-full rounded-md border px-2 py-1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium">מלאי התחלתי</label>
          <input type="number" value={currentStock} onChange={e => setCurrentStock(Number(e.target.value || 0))} className="mt-1 w-full rounded-md border px-2 py-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">סף מלאי נמוך</label>
          <input type="number" value={lowThreshold} onChange={e => setLowThreshold(Number(e.target.value || 0))} className="mt-1 w-full rounded-md border px-2 py-1" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">משקל ליחידה (ק"ג) - רק למוצרים סופיים</label>
        <input type="number" step="0.01" value={weightPerUnit} onChange={e => setWeightPerUnit(Number(e.target.value || 0))} className="mt-1 w-full rounded-md border px-2 py-1" placeholder="0.12" />
      </div>

      {error && <div className="text-sm text-rose-600">{error}</div>}

      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">הוסף מוצר</button>
        <button type="button" onClick={() => { if (onClose) onClose(); }} className="rounded-md border px-4 py-2">ביטול</button>
      </div>
    </form>
  );
}
