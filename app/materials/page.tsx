'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Item = {
  id: string;
  name: string;
  unit_type: string;
  min_stock: number;
  barcode?: string;
  sku?: string;
  package_quantity?: number;
  created_at: string;
};

export default function MaterialsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formUnitType, setFormUnitType] = useState('units');
  const [formMinStock, setFormMinStock] = useState('0');
  const [formBarcode, setFormBarcode] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formPackageQty, setFormPackageQty] = useState('');

  const unitTypes = [
    { value: 'kg', label: 'קילוגרם (ק״ג)' },
    { value: 'liters', label: 'ליטר' },
    { value: 'units', label: 'יחידות' },
    { value: 'meters', label: 'מטרים' },
    { value: 'pieces', label: 'חתיכות' }
  ];

  useEffect(() => {
    loadItems();

    // Supabase Realtime subscription for items table
    const itemsSubscription = supabase
      .channel('items-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        () => {
          loadItems();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(itemsSubscription);
    };
  }, []);

  async function loadItems() {
    try {
      const { data, error: err } = await supabase
        .from('items')
        .select('*')
        .order('name');

      if (err) throw err;
      setItems(data || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Error loading items');
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      if (!formName.trim()) {
        throw new Error('שם הפריט חובה');
      }

      const minStock = parseFloat(formMinStock) || 0;
      if (minStock < 0) {
        throw new Error('סף אזהרה לא יכול להיות שלילי');
      }

      const packageQty = formPackageQty ? parseInt(formPackageQty) : null;
      if (packageQty !== null && packageQty <= 0) {
        throw new Error('כמות באריזה חייבת להיות מספר חיובי');
      }

      const { error: err } = await supabase
        .from('items')
        .insert([
          {
            name: formName.trim(),
            unit_type: formUnitType,
            min_stock: minStock,
            barcode: formBarcode.trim() || null,
            sku: formSku.trim() || null,
            package_quantity: packageQty
          }
        ]);

      if (err) throw err;

      setMessage('✅ פריט נוסף בהצלחה');
      setFormName('');
      setFormUnitType('units');
      setFormMinStock('0');
      setFormBarcode('');
      setFormSku('');
      setFormPackageQty('');

      await loadItems();

      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error adding item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      const { error: err } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId);

      if (err) throw err;

      setMessage('✅ פריט נמחק בהצלחה');
      await loadItems();

      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error deleting item');
    }
  };

  return (
    <div className="px-4 py-6 space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-4xl font-black text-slate-900 mb-2">📋 ניהול פריטים</h1>
        <p className="text-slate-600">הוסף/י, עדכן/י או מחק/י פריטים במחסן</p>
      </div>

      {/* Add Form - Centered */}
      <div className="max-w-md mx-auto">
        <div className="backdrop-blur-xl bg-white/40 rounded-2xl border border-white/60 shadow-2xl p-8 space-y-6">
          <h2 className="text-xl font-semibold text-slate-900 text-center">➕ הוסף פריט חדש</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                📝 שם הפריט
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="למשל: קמח חיטה"
                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
              />
            </div>

            {/* Unit Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                📏 יחידת מידה
              </label>
              <select
                value={formUnitType}
                onChange={(e) => setFormUnitType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
              >
                {unitTypes.map((ut) => (
                  <option key={ut.value} value={ut.value}>
                    {ut.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Stock */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                ⚠️ סף אזהרה
              </label>
              <input
                type="number"
                step="0.01"
                value={formMinStock}
                onChange={(e) => setFormMinStock(e.target.value)}
                placeholder="כמות מינימום"
                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
              />
            </div>

            {/* Barcode - Optional */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                🏷️ ברקוד <span className="text-slate-500 text-xs">(אופציונלי)</span>
              </label>
              <input
                type="text"
                value={formBarcode}
                onChange={(e) => setFormBarcode(e.target.value)}
                placeholder="123456789"
                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
              />
            </div>

            {/* SKU - Optional */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                🔖 מק"ט (SKU) <span className="text-slate-500 text-xs">(אופציונלי)</span>
              </label>
              <input
                type="text"
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                placeholder="PROD-001"
                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
              />
            </div>

            {/* Package Quantity - Optional */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                📦 כמות באריזה <span className="text-slate-500 text-xs">(אופציונלי)</span>
              </label>
              <input
                type="number"
                value={formPackageQty}
                onChange={(e) => setFormPackageQty(e.target.value)}
                placeholder="למשל: 24"
                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                ❌ {error}
              </div>
            )}

            {/* Success */}
            {message && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
                {message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200"
            >
              {submitting ? '⏳ מוסיף...' : '➕ הוסף פריט'}
            </button>
          </form>
        </div>
      </div>

      {/* Items List */}
      <div className="mx-auto max-w-4xl">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
          📦 רשימת פריטים <span className="text-sm bg-slate-200 text-slate-700 px-3 py-1 rounded-full">{items.length}</span>
        </h2>
        {loading ? (
          <div className="text-center py-12 text-slate-600">⏳ טוען...</div>
        ) : items.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/20 rounded-2xl border border-white/40 p-12 text-center">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-lg font-medium text-slate-900">אין פריטים עדיין</p>
            <p className="text-sm text-slate-600 mt-2">הוסף פריט חדש באמצעות הטופס למעלה</p>
          </div>
        ) : (
          <div className="backdrop-blur-xl bg-white/40 rounded-2xl border border-white/60 shadow-xl overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                  <tr>
                    <th className="px-6 py-4 text-right font-semibold">שם הפריט</th>
                    <th className="px-6 py-4 text-right font-semibold">יחידה</th>
                    <th className="px-6 py-4 text-right font-semibold">סף אזהרה</th>
                    <th className="px-6 py-4 text-center font-semibold">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/20">
                  {items.map((item, idx) => (
                    <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white/30' : 'bg-white/50'} hover:bg-white/60 transition-colors`}>
                      <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                      <td className="px-6 py-4 text-slate-700">
                        {unitTypes.find(ut => ut.value === item.unit_type)?.label || item.unit_type}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium">
                          {item.min_stock} {item.unit_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-3 py-1 rounded-lg text-sm font-medium text-red-700 hover:bg-red-100 transition duration-200"
                        >
                          🗑️ מחק
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 p-4">
              {items.map((item) => (
                <div key={item.id} className="bg-white/70 rounded-lg p-4 border border-white/40 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-sm text-slate-600">{unitTypes.find(ut => ut.value === item.unit_type)?.label}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:bg-red-100 p-2 rounded-lg transition"
                    >
                      🗑️
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">סף:</span>
                    <span className="text-sm font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded">
                      {item.min_stock} {item.unit_type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
