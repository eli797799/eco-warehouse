"use client";
import React, { useState, useEffect } from "react";
import supabase from "../../lib/supabaseClient";

type WasteReport = {
  waste_day: string;
  run_count: number;
  total_waste: number;
  avg_waste_percent: number;
  max_waste_percent: number;
  min_waste_percent: number;
};

export default function WasteChart() {
  const [data, setData] = useState<WasteReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWasteReport = async () => {
      const { data: reportData } = await supabase.from("vw_waste_report").select("*").limit(14);
      setData(reportData ?? []);
      setLoading(false);
    };
    fetchWasteReport();
  }, []);

  if (loading) return <div className="text-slate-600">טוען דוח בזבוז...</div>;
  if (data.length === 0) return <div className="text-slate-600">אין נתוני בזבוז עדיין.</div>;

  // Calculate max waste percentage for scaling
  const maxWaste = Math.max(...data.map(d => d.avg_waste_percent), 1);

  return (
    <div className="rounded-lg border p-4 bg-white">
      <h2 className="mb-4 text-lg font-semibold">דוח בזבוז ייצור</h2>
      <div className="space-y-3">
        {data.map((row, idx) => {
          const day = new Date(row.waste_day).toLocaleDateString("he-IL");
          const barWidth = (row.avg_waste_percent / maxWaste) * 100;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{day}</div>
                  <div className="text-xs text-slate-500">{row.run_count} הרצות</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-orange-600">{row.avg_waste_percent}%</div>
                  <div className="text-xs text-slate-500">בזבוז ממוצע</div>
                </div>
              </div>
              <div className="h-6 rounded-md bg-slate-100">
                <div
                  className="h-full rounded-md bg-gradient-to-r from-orange-400 to-orange-600 transition-all"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>כל: {row.total_waste.toFixed(2)} ק"ג</span>
                <span>min: {row.min_waste_percent.toFixed(2)}%, max: {row.max_waste_percent.toFixed(2)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
