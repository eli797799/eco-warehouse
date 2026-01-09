"use client";
import React, { useEffect, useState } from "react";
import supabase from "../../lib/supabaseClient";
import AddProductForm from "./AddProductForm";

type Product = {
  id: string;
  name: string;
  type?: string;
  size?: string;
  material?: string;
  category?: string;
  current_stock: number;
  low_stock_threshold: number;
  created_at: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("products").select("id,name,type,size,material,current_stock,low_stock_threshold,created_at").order('created_at', { ascending: false });
      if (!mounted) return;
      setProducts(data ?? []);
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">מוצרים</h1>
          <p className="text-sm text-slate-600">רשימת כל המוצרים במערכת</p>
        </div>
        <div>
          <AddProductFormWrapper onInserted={() => {
            // refresh the list after insertion
            (async () => {
              const { data } = await supabase.from("products").select("id,name,type,size,material,current_stock,low_stock_threshold,created_at").order('created_at', { ascending: false });
              setProducts(data ?? []);
            })();
          }} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[720px] table-auto text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2">שם מוצר</th>
              <th className="px-4 py-2">קטגוריה</th>
              <th className="px-4 py-2">סוג</th>
              <th className="px-4 py-2">גודל</th>
              <th className="px-4 py-2">חומר</th>
              <th className="px-4 py-2">מלאי</th>
              <th className="px-4 py-2">סף נמוך</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center">טוען...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center">אין מוצרים להצגה.</td></tr>
            ) : (
              products.map(p => (
                <tr key={p.id} className="odd:bg-white even:bg-slate-50">
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2">{p.category === 'raw_material' ? 'חומר גלם' : 'מוצר סופי'}</td>
                  <td className="px-4 py-2">{p.type ?? '-'}</td>
                  <td className="px-4 py-2">{p.size ?? '-'}</td>
                  <td className="px-4 py-2">{p.material ?? '-'}</td>
                  <td className="px-4 py-2">{p.current_stock}</td>
                  <td className="px-4 py-2">{p.low_stock_threshold}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Client wrapper that shows a toggle button and inline form
function AddProductFormWrapper({ onInserted }: { onInserted?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col items-end">
      <div className="mb-2">
        <button onClick={() => setOpen(o => !o)} className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">הוסף מוצר חדש</button>
      </div>
      {open && (
        <div className="w-full max-w-md">
          <AddProductForm onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
