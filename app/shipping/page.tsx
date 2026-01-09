"use client";
import React, { useEffect, useState } from "react";
import supabase from "../../lib/supabaseClient";

type Product = {
  id: string;
  name: string;
  category?: string;
  current_stock: number;
  weight_per_unit?: number;
};

type ShippingItem = {
  productId: string;
  productName?: string;
  quantity: number;
};

export default function ShippingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from("products").select("id,name,current_stock").eq("category", "finished_product");
      setProducts(data ?? []);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">משלוח ללקוחות</h1>
        <p className="text-sm text-slate-600">הקלד פרטי משלוח ותעד את המוצרים שנשלחו</p>
      </div>

      {loading ? (
        <div className="mt-4 p-4 text-slate-600">טוען...</div>
      ) : (
        <ShippingForm finishedProducts={products} />
      )}
    </div>
  );
}

function ShippingForm({ finishedProducts }: { finishedProducts: Product[] }) {
  const [customerName, setCustomerName] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [items, setItems] = useState<ShippingItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAddItem = () => {
    if (!selectedProduct || selectedQuantity <= 0) {
      setError("בחר מוצר והקלד כמות");
      return;
    }

    const product = finishedProducts.find(p => p.id === selectedProduct);
    if (!product) return;

    // Check if already added
    const existing = items.find(i => i.productId === selectedProduct);
    if (existing) {
      setError("מוצר זה כבר בטבלה");
      return;
    }

    setItems([...items, {
      productId: selectedProduct,
      productName: product.name,
      quantity: selectedQuantity,
    }]);
    setSelectedProduct("");
    setSelectedQuantity(0);
    setError(null);
  };

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter(i => i.productId !== productId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (!customerName || !docNumber || items.length === 0) {
      setError("מלא את כל השדות");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          docNumber,
          items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "שגיאה בשרת");
      }

      setSuccess(true);
      setCustomerName("");
      setDocNumber("");
      setItems([]);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedProd = finishedProducts.find(p => p.id === selectedProduct);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="mt-6 grid gap-6 sm:grid-cols-2">
      {/* Form */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">פרטי משלוח</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium">שם הלקוח</label>
            <input
              required
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="mt-1 w-full rounded-md border px-2 py-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">מספר תעודה</label>
            <input
              required
              value={docNumber}
              onChange={e => setDocNumber(e.target.value)}
              className="mt-1 w-full rounded-md border px-2 py-1"
            />
          </div>

          <hr className="my-3" />

          <div>
            <label className="block text-sm font-medium">בחר מוצר להוספה</label>
            <select
              value={selectedProduct}
              onChange={e => setSelectedProduct(e.target.value)}
              className="mt-1 w-full rounded-md border px-2 py-1"
            >
              <option value="">בחר מוצר</option>
              {finishedProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (במלאי: {p.current_stock})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">כמות</label>
            <input
              type="number"
              value={selectedQuantity}
              onChange={e => setSelectedQuantity(Number(e.target.value || 0))}
              className="mt-1 w-full rounded-md border px-2 py-1"
            />
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            הוסף לטבלה
          </button>

          <hr className="my-3" />

          {error && <div className="rounded-md bg-red-50 p-2 text-sm text-rose-700">{error}</div>}
          {success && <div className="rounded-md bg-green-50 p-2 text-sm text-green-700">משלוח נשמר בהצלחה!</div>}

          <button
            type="submit"
            disabled={loading || items.length === 0}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "מעבד..." : "אשר משלוח"}
          </button>
        </form>
      </div>

      {/* Items Table */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-lg font-semibold">מוצרים בטבלה ({totalItems} יחידות)</h3>
        {items.length === 0 ? (
          <div className="text-slate-600">אין פריטים.</div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.productId} className="flex items-center justify-between rounded-md border p-2 bg-slate-50">
                <div>
                  <div className="font-medium">{item.productName}</div>
                  <div className="text-sm text-slate-500">{item.quantity} יחידות</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.productId)}
                  className="text-red-600 hover:underline"
                >
                  הסר
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
