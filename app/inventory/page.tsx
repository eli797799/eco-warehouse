'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Item = {
  id: string;
  name: string;
  unit_type: string;
  min_stock: number;
};

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadItems() {
      try {
        const { data, error: err } = await supabase
          .from('items')
          .select('id,name,unit_type,min_stock')
          .order('name');

        if (err) throw err;
        setItems(data || []);
      } catch (err: any) {
        setError(err.message || 'Error loading items');
      } finally {
        setLoading(false);
      }
    }

    loadItems();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      if (!selectedItemId || !quantity) {
        throw new Error('בחר/י פריט וכמות');
      }

      const numQuantity = parseFloat(quantity);
      if (isNaN(numQuantity) || numQuantity <= 0) {
        throw new Error('הכמות חייבת להיות מספר חיובי');
      }

      // CRITICAL: STATIC lowercase 'in' for RECEIVE/STOCK IN
      console.log('🟢 VERIFICATION: Saving as STOCK IN movement (lowercase "in")');
      console.log('Movement data:', { item_id: selectedItemId, quantity: numQuantity, movement_type: 'in' });
      alert('🟢 Confirming STOCK IN movement');

      const { error: err } = await supabase
        .from('inventory_movements')
        .insert([
          {
            item_id: selectedItemId,
            quantity: numQuantity,
            movement_type: 'in',
            notes: notes || null
          }
        ]);

      if (err) throw err;

      setMessage('✅ קבלה נרשמה בהצלחה');
      setSelectedItemId('');
      setQuantity('');
      setNotes('');

      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error recording movement');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedItem = items.find(i => i.id === selectedItemId);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-slate-900 mb-2">📥 קבלה חומרים</h1>
          <p className="text-slate-600">רשום/י קבלת חומרים חדשים למחסן</p>
        </div>

        {/* Glassmorphism Card */}
        <div className="backdrop-blur-xl bg-white/40 rounded-2xl border border-white/60 shadow-2xl p-8 space-y-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Item Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                📦 בחר/י פריט
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all duration-200"
                disabled={loading}
              >
                <option value="">-- בחר/י פריט מהרשימה --</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                🔢 כמות
                {selectedItem && (
                  <span className="text-slate-500 font-normal"> ({selectedItem.unit_type})</span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="הכנס/י כמות"
                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all duration-200"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                📝 הערות (אופציונלי)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="תיאור המקור, מספר הזמנה, וכו׳"
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all duration-200 resize-none"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-slate-400 disabled:to-slate-500 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200"
            >
              {submitting ? '⏳ שומר...' : '🟢 Confirm STOCK IN'}
            </button>
          </form>
        </div>

        {/* Info Card */}
        <div className="backdrop-blur-xl bg-white/20 rounded-xl border border-white/40 p-4 text-sm text-slate-600 space-y-2">
          <p>💡 <strong>טיפ:</strong> הכנס את מזהה הפריט מהרשימה בדף ניהול חומרים</p>
          <p>📱 <strong>זמין:</strong> ניתן להשתמש בטופס זה מכל מכשיר</p>
        </div>
      </div>
    </div>
  );
}
