"use client";
import React, { useEffect, useState } from "react";
import supabase from "../../lib/supabaseClient";

type Product = {
  id: string;
  name: string;
  category?: string;
  current_stock: number;
};

type DeliveryItem = {
  productId: string;
  productName: string;
  quantity: number;
};

export default function DeliveryPage() {
  const [finishedProducts, setFinishedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("products").select("id,name,current_stock").eq("category", "finished_product");
      setFinishedProducts(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">תעודת משלוח</h1>
        <p className="text-sm text-slate-600">הקלד משלוח מוצרים סופיים ללקוחות</p>
      </div>

      {loading ? (
        <div className="mt-4 p-4 text-slate-600">טוען...</div>
      ) : (
        <DeliveryForm finishedProducts={finishedProducts} />
      )}
    </div>
  );
}

function DeliveryForm({ finishedProducts }: { finishedProducts: Product[] }) {
  const [customerName, setCustomerName] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productInputValue, setProductInputValue] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAddItem = async () => {
    if (!productInputValue || selectedQuantity <= 0) {
      setError("בחר מוצר והקלד כמות");
      return;
    }

    let productId = selectedProduct;
    let product = finishedProducts.find(p => p.id === selectedProduct);

    // If product doesn't exist, create it
    if (!product) {
      try {
        const { data: newProduct, error: createErr } = await supabase
          .from("products")
          .insert([{
            name: productInputValue,
            category: "finished_product",
            current_stock: selectedQuantity,
            low_stock_threshold: Math.ceil(selectedQuantity * 0.1),
          }])
          .select()
          .single();

        if (createErr) throw createErr;
        product = newProduct as Product;
        productId = product.id;
      } catch (err: any) {
        setError("שגיאה ביצירת מוצר: " + err.message);
        return;
      }
    }

    if (product.current_stock < selectedQuantity) {
      setError(`אין מספיק מלאי של ${product.name}. זמין: ${product.current_stock}`);
      return;
    }

    const existing = items.find(i => i.productId === productId);
    if (existing) {
      setError("מוצר זה כבר בטבלה");
      return;
    }

    setItems([...items, {
      productId,
      productName: product.name,
      quantity: selectedQuantity,
    }]);
    setProductInputValue("");
    setSelectedProduct("");
    setSelectedQuantity(0);
    setError(null);
  };

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter(i => i.productId !== productId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !docNumber || items.length === 0) {
      setError("מלא את כל השדות");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Create shipping document
      const { data: doc, error: docErr } = await supabase
        .from("shipping_docs")
        .insert([{
          customer_name: customerName,
          doc_number: docNumber,
          status: "COMPLETED",
        }])
        .select()
        .single();

      if (docErr) throw docErr;

      // Process each item
      for (const item of items) {
        const product = finishedProducts.find(p => p.id === item.productId);
        if (!product) continue;

        // Insert shipping item
        await supabase.from("shipping_items").insert([{
          doc_id: doc.id,
          product_id: item.productId,
          quantity: item.quantity,
        }]);

        // Create OUT movement
        await supabase.from("inventory_movements").insert([{
          product_id: item.productId,
          type: "OUT",
          quantity: item.quantity,
          notes: `משלוח למישהו: ${customerName}`,
        }]);

        // Update stock
        await supabase
          .from("products")
          .update({ current_stock: product.current_stock - item.quantity })
          .eq("id", item.productId);
      }

      setSuccess(true);
      setCustomerName("");
      setDocNumber("");
      setItems([]);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedProd = finishedProducts.find(p => p.id === selectedProduct);

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
            <label className="block text-sm font-medium">בחר או הקלד שם מוצר</label>
            <input
              type="text"
              placeholder="הקלד שם מוצר..."
              value={productInputValue}
              onChange={e => {
                const text = e.target.value;
                setProductInputValue(text);
                const product = finishedProducts.find(p => p.name === text);
                if (product) {
                  setSelectedProduct(product.id);
                } else {
                  setSelectedProduct("");
                }
              }}
              list="products-list"
              className="mt-1 w-full rounded-md border px-2 py-1"
            />
            <datalist id="products-list">
              {finishedProducts.map(p => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
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

          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
          {success && <div className="text-sm text-green-600 bg-green-50 p-2 rounded">משלוח נשמר בהצלחה!</div>}

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
        <h3 className="mb-3 text-lg font-semibold">
          מוצרים בטבלה ({items.reduce((s, i) => s + i.quantity, 0)} יחידות)
        </h3>
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
