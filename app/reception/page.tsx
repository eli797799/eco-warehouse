'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Movement = {
  id: string;
  name: string;
  unit_type: string;
  quantity: number;
  movement_type: 'IN' | 'OUT';
  notes?: string;
  date: string;
};

export default function ReceptionPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadMovements();

    // Supabase Realtime subscription for inventory_movements table
    const movementsSubscription = supabase
      .channel('movements-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_movements' },
        () => {
          loadMovements();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(movementsSubscription);
    };
  }, [filterType]);

  async function loadMovements() {
    try {
      let query = supabase
        .from('inventory_movements')
        .select(`
          *,
          items (
            name,
            unit_type
          )
        `);

      if (filterType !== 'ALL') {
        query = query.eq('movement_type', filterType);
      }

      const { data, error: err } = await query.order('created_at', { ascending: false });

      if (err) throw err;
      
      // Transform data to flatten the items object
      const transformedData = (data || []).map((m: any) => ({
        ...m,
        name: m.items?.name || 'פריט לא ידוע',
        unit_type: m.items?.unit_type || '',
        date: m.created_at
      }));
      
      setMovements(transformedData);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Error loading movements');
    } finally {
      setLoading(false);
    }
  }

  const filteredMovements = movements.filter((m) => {
    if (!searchTerm) return true;
    return m.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const inMovements = filteredMovements.filter(m => m.movement_type === 'IN').length;
  const outMovements = filteredMovements.filter(m => m.movement_type === 'OUT').length;

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-slate-900 mb-2">📜 היסטוריית תנועות</h1>
        <p className="text-slate-600">חפש/י וצפה/י בכל תנועות המלאי</p>
      </div>

      {error && (
        <div className="mx-auto max-w-4xl p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          ❌ {error}
        </div>
      )}

      {/* Filters - Glassmorphic */}
      <div className="mx-auto max-w-4xl backdrop-blur-xl bg-white/40 rounded-2xl border border-white/60 shadow-xl p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Search */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              🔍 חיפוש בשם פריט
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="הקלד שם..."
              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
            />
          </div>

          {/* Filter by Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              📋 סוג תנועה
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
            >
              <option value="ALL">כל התנועות</option>
              <option value="IN">קבלות בלבד 📥</option>
              <option value="OUT">הוצאות בלבד 📤</option>
            </select>
          </div>

          {/* Summary */}
          <div className="flex items-end">
            <div className="w-full bg-gradient-to-r from-blue-100/50 to-purple-100/50 rounded-xl border border-blue-200 p-4">
              <div className="space-y-1 text-sm">
                <p className="text-blue-900 font-bold text-lg">{filteredMovements.length}</p>
                <p className="text-blue-700 text-xs">
                  <span className="font-semibold">{inMovements}</span> קבלות • 
                  <span className="font-semibold ml-1">{outMovements}</span> הוצאות
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="mx-auto max-w-4xl">
        {loading ? (
          <div className="text-center py-12 text-slate-600">⏳ טוען...</div>
        ) : filteredMovements.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/20 rounded-2xl border border-white/40 p-12 text-center">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-lg font-medium text-slate-900">אין תנועות</p>
            <p className="text-sm text-slate-600 mt-2">הוסף קבלות או הוצאות כדי להתחיל</p>
          </div>
        ) : (
          <div className="backdrop-blur-xl bg-white/40 rounded-2xl border border-white/60 shadow-xl overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                  <tr>
                    <th className="px-6 py-4 text-right font-semibold">תאריך ושעה</th>
                    <th className="px-6 py-4 text-right font-semibold">שם פריט</th>
                    <th className="px-6 py-4 text-right font-semibold">כמות</th>
                    <th className="px-6 py-4 text-right font-semibold">סוג</th>
                    <th className="px-6 py-4 text-right font-semibold">הערות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/20">
                  {filteredMovements.map((movement, idx) => {
                    const isIn = movement.movement_type === 'IN';
                    const dateStr = new Date(movement.date).toLocaleString('he-IL', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <tr key={movement.id} className={`${idx % 2 === 0 ? 'bg-white/30' : 'bg-white/50'} hover:bg-white/60 transition-colors border-l-4 ${isIn ? 'border-emerald-500' : 'border-red-500'}`}>
                        <td className="px-6 py-4 text-slate-700 text-xs font-mono">{dateStr}</td>
                        <td className="px-6 py-4 font-medium text-slate-900">{movement.name}</td>
                        <td className="px-6 py-4 text-slate-700 font-semibold">
                          {movement.quantity} {movement.unit_type}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              isIn
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {isIn ? '📥 קבלה' : '📤 הוצאה'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-xs">
                          {movement.notes ? (
                            <span className="bg-slate-100/50 px-2 py-1 rounded-lg inline-block">{movement.notes}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 p-4">
              {filteredMovements.map((movement) => {
                const isIn = movement.movement_type === 'IN';
                const dateStr = new Date(movement.date).toLocaleString('he-IL', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={movement.id}
                    className={`rounded-lg p-4 border-l-4 ${
                      isIn
                        ? 'bg-emerald-50 border-emerald-500'
                        : 'bg-red-50 border-red-500'
                    } space-y-2`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-bold text-lg text-slate-900">{movement.name}</p>
                        <p className="text-xs text-slate-600 font-mono mt-1">{dateStr}</p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-full ${
                          isIn
                            ? 'bg-emerald-200 text-emerald-700'
                            : 'bg-red-200 text-red-700'
                        }`}
                      >
                        {isIn ? '📥' : '📤'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">
                        {movement.quantity} {movement.unit_type}
                      </span>
                      {movement.notes && (
                        <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded">
                          {movement.notes}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
