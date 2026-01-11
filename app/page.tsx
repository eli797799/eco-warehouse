'use client';
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ExportButton from "./components/ExportButton";

type Item = {
  id: string;
  name: string;
  unit_type: string;
  min_stock: number;
};

type Movement = {
  id: string;
  item_id: string;
  quantity: number;
  movement_type: string;
  notes?: string;
  created_at: string;
};

type ExpiringItem = {
  id: string;
  item_id: string;
  name: string;
  unit_type: string;
  quantity: number;
  expiry_date: string;
  days_until_expiry: number;
  expiry_status: 'expired' | 'critical' | 'warning' | 'ok';
};

export default function WarehouseDashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [expiringItems, setExpiringItems] = useState<ExpiringItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch items baseline
        const { data: itemsData, error: itemsError } = await supabase
          .from("items")
          .select("id,name,unit_type,min_stock");
        if (itemsError) {
          console.error("Error loading items:", itemsError);
          throw new Error(`Failed to load items: ${itemsError.message}`);
        }

        // Fetch all movements to aggregate
        const { data: movementsData, error: movementsError } = await supabase
          .from("inventory_movements")
          .select("id,item_id,quantity,movement_type,notes,created_at")
          .order("created_at", { ascending: false });

        if (movementsError) {
          console.error("Error loading movements:", movementsError);
          throw new Error(`Failed to load movements: ${movementsError.message}`);
        }

        setItems(itemsData ?? []);
        setMovements(movementsData ?? []);

        // Fetch expiring items
        const { data: expiringData, error: expiringError } = await supabase
          .from("expiring_items")
          .select("*")
          .order("expiry_date", { ascending: true });

        if (!expiringError) {
          setExpiringItems(expiringData ?? []);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error loading data:", err);
        setLoading(false);
      }
    }

    loadData();

    // Supabase Realtime subscriptions
    const itemsSubscription = supabase
      .channel('dashboard-items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        () => {
          console.log('🔄 Items changed, reloading...');
          loadData();
        }
      )
      .subscribe();

    const movementsSubscription = supabase
      .channel('dashboard-movements')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_movements' },
        () => {
          console.log('🔄 Movements changed, reloading...');
          loadData();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(itemsSubscription);
      supabase.removeChannel(movementsSubscription);
    };
  }, []);

  // Build maps
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const stockMap = new Map<string, number>();

  for (const m of movements) {
    const key = m.item_id;
    const delta = m.movement_type.toLowerCase() === "out" ? -m.quantity : m.quantity;
    stockMap.set(key, (stockMap.get(key) || 0) + delta);
  }

  const itemsWithStock = items.map((item) => ({
    ...item,
    current_stock: stockMap.get(item.id) || 0,
  }));

  const lowStockAlerts = itemsWithStock.filter((i) => i.current_stock <= i.min_stock);

  const todayMovements = movements
    .filter((m) => {
      const d = new Date(m.created_at);
      const now = new Date();
      return d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
    })
    .map((m) => {
      const meta = itemMap.get(m.item_id);
      return {
        ...m,
        name: meta?.name || 'פריט',
        unit_type: meta?.unit_type || '',
      };
    });

  // KPIs
  const totalItemsCount = itemsWithStock.length;
  const lowStockCount = lowStockAlerts.length;
  const todayMovementsCount = todayMovements.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl font-semibold text-slate-700">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
      <div className="px-4 py-8 min-h-screen">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <section className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 text-center" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.02em' }}>לוח מחוונים</h1>
            <p className="text-slate-600 mt-2 text-lg font-medium text-center">ניהול מלאי וניטור תנועות במחסן</p>
          </section>

          {/* KPI Cards - Glassmorphism */}
          <section className="grid gap-6 sm:grid-cols-3 mb-10">
            {/* Total Items Card */}
            <div className="rounded-2xl p-8 bg-white/40 backdrop-blur-lg border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-600 uppercase tracking-wider">סה״כ פריטים</p>
                  <p className="text-5xl font-black text-emerald-600 mt-3" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{totalItemsCount}</p>
                  <p className="text-xs text-slate-500 mt-3">🟢 כל הפריטים במערכת</p>
              </div>
              <div className="text-5xl">📦</div>
            </div>
          </div>

          {/* Low Stock Alerts Card */}
          <div className="rounded-2xl p-8 bg-white/40 backdrop-blur-lg border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wider">מלאי נמוך</p>
                <p className="text-5xl font-black text-amber-600 mt-3" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{lowStockCount}</p>
                <p className="text-xs text-slate-500 mt-3">⚠️ דורשים הזמנה</p>
              </div>
              <div className="text-5xl">🔔</div>
            </div>
          </div>

          {/* Today's Movements Card */}
          <div className="rounded-2xl p-8 bg-white/40 backdrop-blur-lg border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wider">תנועות היום</p>
                <p className="text-5xl font-black text-emerald-600 mt-3" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{todayMovementsCount}</p>
                <p className="text-xs text-slate-500 mt-3">📊 פעולות בתאריך</p>
              </div>
              <div className="text-5xl">⚡</div>
            </div>
          </div>
        </section>

        {/* Expiring Items Alert Section */}
        {expiringItems.length > 0 && (
          <section className="mb-10">
            <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">⚠️</div>
                <h2 className="text-xl font-bold text-amber-900">התראות תפוגה</h2>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-200 text-amber-900">
                  {expiringItems.length} פריטים
                </span>
              </div>
              <p className="text-sm text-amber-800 mb-4">
                פריטים עם תאריך תפוגה ב-30 הימים הקרובים או שכבר פגו תוקף
              </p>
              <div className="space-y-3">
                {expiringItems.map((item) => {
                  const isExpired = item.expiry_status === 'expired';
                  const isCritical = item.expiry_status === 'critical';
                  
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl p-4 border-l-4 ${
                        isExpired
                          ? 'bg-red-100 border-red-500'
                          : isCritical
                          ? 'bg-orange-100 border-orange-500'
                          : 'bg-yellow-100 border-yellow-500'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">{item.name}</p>
                          <p className="text-sm text-slate-700 mt-1">
                            כמות: {item.quantity} {item.unit_type}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            תאריך תפוגה: {new Date(item.expiry_date).toLocaleDateString('he-IL')}
                          </p>
                        </div>
                        <div className="text-left">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              isExpired
                                ? 'bg-red-200 text-red-900'
                                : isCritical
                                ? 'bg-orange-200 text-orange-900'
                                : 'bg-yellow-200 text-yellow-900'
                            }`}
                          >
                            {isExpired
                              ? `פג תוקף ${Math.abs(item.days_until_expiry)} ימים`
                              : `${item.days_until_expiry} ימים`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Stock Status Table */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">📦 מצב מלאי עדכני</h2>
              <span className="px-4 py-2 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">{itemsWithStock.length} פריטים</span>
            </div>
            <ExportButton items={itemsWithStock} />
          </div>
          
          {itemsWithStock.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center backdrop-blur-xl bg-white/20">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">אין פריטים במחסן</h3>
              <p className="text-slate-600 mb-6">בואו נתחיל! הוסף את הפריט הראשון שלך.</p>
              <a href="/materials" className="inline-block rounded-lg bg-emerald-600 text-white px-6 py-3 font-semibold hover:bg-emerald-700 transition-colors">
                ➕ הוסף פריט ראשון
              </a>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/60 overflow-hidden shadow-lg backdrop-blur-xl bg-white/40">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-right font-bold">שם הפריט</th>
                      <th className="px-6 py-4 text-right font-bold">מלאי</th>
                      <th className="px-6 py-4 text-right font-bold">התקדמות</th>
                      <th className="px-6 py-4 text-right font-bold">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/20">
                    {itemsWithStock.map((item, index) => {
                      const isLowStock = item.current_stock <= item.min_stock;
                      const percentage = Math.min((item.current_stock / Math.max(item.min_stock, 1)) * 100, 100);
                      const unitLabels: Record<string, string> = {
                        kg: "ק״ג",
                        liters: "ליטר",
                        units: "יחידות",
                        meters: "מטרים",
                        pieces: "חתיכות"
                      };
                      const unitLabel = unitLabels[item.unit_type] || item.unit_type;

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            index % 2 === 0 ? 'bg-white/30 hover:bg-white/50' : 'bg-white/50 hover:bg-white/70'
                          }`}
                        >
                          <td className="px-6 py-4 font-semibold text-slate-900">{item.name}</td>
                          <td className="px-6 py-4">
                            <span className="text-lg font-bold text-slate-900">{item.current_stock}</span>
                            <span className="text-xs text-slate-600 ml-2">{unitLabel}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-full bg-slate-200/50 rounded-full h-2.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isLowStock 
                                    ? 'bg-gradient-to-r from-red-500 to-red-600' 
                                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <p className="text-xs text-slate-600 mt-1">סף: {item.min_stock}</p>
                          </td>
                          <td className="px-6 py-4">
                            {isLowStock ? (
                              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300">
                                <span className="animate-pulse">🔴</span> מעט מאוד
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
                                <span>✓</span> בסדר
                              </span>
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
                {itemsWithStock.map((item) => {
                  const isLowStock = item.current_stock <= item.min_stock;
                  const percentage = Math.min((item.current_stock / Math.max(item.min_stock, 1)) * 100, 100);
                  const unitLabels: Record<string, string> = {
                    kg: "ק״ג",
                    liters: "ליטר",
                    units: "יחידות",
                    meters: "מטרים",
                    pieces: "חתיכות"
                  };
                  const unitLabel = unitLabels[item.unit_type] || item.unit_type;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-lg p-4 border border-white/40 ${
                        isLowStock ? 'bg-red-50/50' : 'bg-white/50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <p className="text-sm text-slate-600">{item.current_stock} {unitLabel}</p>
                        </div>
                        {isLowStock ? (
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-700">🔴 מעט</span>
                        ) : (
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">✓ בסדר</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="w-full bg-slate-200/50 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isLowStock 
                                ? 'bg-gradient-to-r from-red-500 to-red-600' 
                                : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-600">סף: {item.min_stock} {unitLabel}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Today's Movements */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-slate-900">⚡ תנועות היום</h2>
            <span className="px-4 py-2 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">{todayMovements.length} פעולות</span>
          </div>
          
          {todayMovements.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center backdrop-blur-xl bg-white/20">
              <div className="text-6xl mb-4">☀️</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">יום שקט במחסן</h3>
              <p className="text-slate-600">עדיין אין תנועות היום. תחזור מאוחר יותר!</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/60 overflow-hidden shadow-lg backdrop-blur-xl bg-white/40">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-right font-bold">⏰ שעה</th>
                      <th className="px-6 py-4 text-right font-bold">📦 פריט</th>
                      <th className="px-6 py-4 text-right font-bold">📊 כמות</th>
                      <th className="px-6 py-4 text-right font-bold">🔄 סוג</th>
                      <th className="px-6 py-4 text-right font-bold">📝 הערות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/20">
                    {todayMovements.map((movement, index) => {
                      const isInMovement = movement.movement_type.toLowerCase() === "in";
                      const timeStr = new Date(movement.created_at).toLocaleTimeString("he-IL", {
                        hour: "2-digit",
                        minute: "2-digit"
                      });

                      return (
                        <tr 
                          key={movement.id} 
                          className={`transition-colors ${
                            index % 2 === 0 ? 'bg-white/30 hover:bg-white/50' : 'bg-white/50 hover:bg-white/70'
                          } ${isInMovement ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-red-500'}`}
                        >
                          <td className="px-6 py-4 font-semibold text-slate-900">{timeStr}</td>
                          <td className="px-6 py-4 font-semibold text-slate-900">{movement.name}</td>
                          <td className="px-6 py-4">
                            <span className="text-lg font-bold text-slate-900">{movement.quantity}</span>
                            <span className="text-xs text-slate-600 ml-2">{movement.unit_type}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border ${
                                isInMovement
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                  : 'bg-red-100 text-red-700 border-red-300'
                              }`}
                            >
                              {isInMovement ? '📥' : '📤'}
                              {isInMovement ? 'קבלה' : 'הוצאה'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-700 text-xs font-medium">
                            {movement.notes ? (
                              <span className="inline-block max-w-xs truncate bg-slate-100/50 px-3 py-1 rounded-lg">
                                {movement.notes}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
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
                {todayMovements.map((movement) => {
                  const isInMovement = movement.movement_type.toLowerCase() === "in";
                  const timeStr = new Date(movement.created_at).toLocaleTimeString("he-IL", {
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <div
                      key={movement.id}
                      className={`rounded-lg p-4 border-l-4 ${
                        isInMovement
                          ? 'bg-emerald-50/50 border-emerald-500'
                          : 'bg-red-50/50 border-red-500'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{movement.name}</p>
                          <p className="text-xs text-slate-600 font-mono">{timeStr}</p>
                        </div>
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full ${
                            isInMovement
                              ? 'bg-emerald-200 text-emerald-700'
                              : 'bg-red-200 text-red-700'
                          }`}
                        >
                          {isInMovement ? '📥' : '📤'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900">
                          {movement.quantity} {movement.unit_type}
                        </span>
                        {movement.notes && (
                          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded truncate max-w-[150px]">
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
        </section>
        </div>
      </div>
    );
}
