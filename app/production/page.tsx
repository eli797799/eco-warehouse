"use client";
import React, { useEffect, useState } from "react";
import supabase from "../../lib/supabaseClient";

type Product = {
  id: string;
  name: string;
  category?: string;
  current_stock: number;
  weight_per_unit?: number;
  unit_type?: string;
};

type ProductionResult = {
  id: string;
  theoretical_output_weight: number;
  waste_quantity: number;
  waste_percentage: number;
  rawMaterialName: string;
  finishedProductName: string;
  finished_product_quantity: number;
};

type Recipe = {
  id: string;
  finished_product_id: string;
  raw_material_id: string;
  required_quantity: number;
  unit_type?: string;
};

type RecipeIngredient = {
  material_id: string;
  material_name: string;
  required_quantity: number;
  unit_type?: string;
  user_input_quantity: number;
};

export default function ProductionPage() {
  const [rawMaterials, setRawMaterials] = useState<Product[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data: rawMat, error: rawErr } = await supabase.from("products").select("id,name,current_stock,weight_per_unit").eq("category", "raw_material");
        if (rawErr) throw new Error(`Failed to load raw materials: ${rawErr.message}`);
        
        const { data: finProd, error: finErr } = await supabase.from("products").select("id,name,current_stock,weight_per_unit").eq("category", "finished_product");
        if (finErr) throw new Error(`Failed to load finished products: ${finErr.message}`);
        
        setRawMaterials(rawMat ?? []);
        setFinishedProducts(finProd ?? []);
      } catch (error: any) {
        console.error("Error loading products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">הרצת ייצור</h1>
        <p className="text-sm text-slate-600">הנח חומר גלם וקבל מוצרים סופיים — המערכת תחשב בשבילך</p>
      </div>

      {loading ? (
        <div className="mt-4 p-4 text-slate-600">טוען...</div>
      ) : (
        <ProductionForm rawMaterials={rawMaterials} finishedProducts={finishedProducts} />
      )}
    </div>
  );
}

function ProductionForm({
  rawMaterials,
  finishedProducts,
}: {
  rawMaterials: Product[];
  finishedProducts: Product[];
}) {
  const [selectedRawMaterial, setSelectedRawMaterial] = useState("");
  const [rawMaterialInputValue, setRawMaterialInputValue] = useState("");
  const [rawMaterialQty, setRawMaterialQty] = useState<number>(0);
  const [selectedFinishedProduct, setSelectedFinishedProduct] = useState("");
  const [finishedProductInputValue, setFinishedProductInputValue] = useState("");
  const [finishedProductQty, setFinishedProductQty] = useState<number>(0);
  const [useBOM, setUseBOM] = useState(false);
  const [bomIngredients, setBomIngredients] = useState<RecipeIngredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProductionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load BOM when finished product is selected
  const loadBOM = async (productId: string) => {
    if (!productId) {
      setBomIngredients([]);
      setUseBOM(false);
      return;
    }
    
    try {
      const { data: recipes, error: err } = await supabase
        .from("product_recipes")
        .select("*")
        .eq("finished_product_id", productId);
      
      if (err) throw err;
      
      if (recipes && recipes.length > 0) {
        // Load material names
        const ingredients: RecipeIngredient[] = [];
        for (const recipe of recipes) {
          const { data: material } = await supabase
            .from("products")
            .select("id,name,category")
            .eq("id", recipe.raw_material_id)
            .single();
          
          ingredients.push({
            material_id: recipe.raw_material_id,
            material_name: material?.name || recipe.raw_material_id,
              required_quantity: recipe.required_quantity,
            user_input_quantity: 0,
          });
        }
        setBomIngredients(ingredients);
        setUseBOM(true);
      } else {
        setBomIngredients([]);
        setUseBOM(false);
      }
    } catch (err: any) {
      console.error("Error loading BOM:", err);
      setBomIngredients([]);
      setUseBOM(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!finishedProductInputValue || finishedProductQty <= 0) {
      setError("בחר מוצר סופי והקלד כמות");
      return;
    }

    // Check BOM validation if using BOM
    if (useBOM && bomIngredients.length > 0) {
      const allFilled = bomIngredients.every(ing => ing.user_input_quantity > 0);
      if (!allFilled) {
        setError("מלא את כל כמויות חומרי הגלם");
        return;
      }
    } else if (!useBOM && (!rawMaterialInputValue || rawMaterialQty <= 0)) {
      setError("בחר חומר גלם והקלד כמות");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let finProdId = selectedFinishedProduct;

      // Create finished product if doesn't exist
      if (!finProdId) {
        const { data: newProd, error: err2 } = await supabase.from("products").insert([{
          name: finishedProductInputValue,
          category: "finished_product",
          current_stock: finishedProductQty,
          low_stock_threshold: Math.ceil(finishedProductQty * 0.1),
        }]).select("id,name,category,current_stock").single();
        if (err2) throw err2;
        finProdId = newProd.id;
      }

      // If using BOM, create movements for each ingredient
      if (useBOM && bomIngredients.length > 0) {
        for (const ingredient of bomIngredients) {
          // Get or create the raw material
          let matId = ingredient.material_id;
          const { data: product } = await supabase
            .from("products")
            .select("id,name,category,current_stock")
            .eq("id", matId)
            .single();

          if (!product) {
            const { data: newMat, error: err3 } = await supabase.from("products").insert([{
              name: ingredient.material_name,
              category: "raw_material",
              current_stock: 0,
              low_stock_threshold: 0,
            }]).select("id,name,category").single();
            if (err3) throw err3;
            matId = newMat.id;
          }

          // Create movement for this ingredient
          const { error: movErr } = await supabase.from("inventory_movements").insert([{
            product_id: matId,
            type: "OUT",
            quantity: ingredient.user_input_quantity,
            notes: `הוצאה לייצור - ${finishedProductInputValue}`,
          }]);
          if (movErr) throw movErr;

          // Update stock
          const newStock = (product?.current_stock || 0) - ingredient.user_input_quantity;
          const { error: updateErr } = await supabase
            .from("products")
            .update({ current_stock: newStock })
            .eq("id", matId);
          if (updateErr) throw updateErr;
        }

        // Create finished product movement (intake)
        const { error: fpErr } = await supabase.from("inventory_movements").insert([{
          product_id: finProdId,
          type: "IN",
          quantity: finishedProductQty,
          notes: "תוצר ייצור",
        }]);
        if (fpErr) throw fpErr;

        // Update finished product stock
        const { data: fpProduct } = await supabase
          .from("products")
          .select("current_stock")
          .eq("id", finProdId)
          .single();
        
        const newFpStock = (fpProduct?.current_stock || 0) + finishedProductQty;
        const { error: fpUpdateErr } = await supabase
          .from("products")
          .update({ current_stock: newFpStock })
          .eq("id", finProdId);
        if (fpUpdateErr) throw fpUpdateErr;

        setResult({
          id: "bom-production",
          theoretical_output_weight: 0,
          waste_quantity: 0,
          waste_percentage: 0,
          rawMaterialName: "מתכון",
          finishedProductName: finishedProductInputValue,
          finished_product_quantity: finishedProductQty,
        });
      } else {
        // Original single raw material flow
        let rawMatId = selectedRawMaterial;

        // Create raw material if doesn't exist
        if (!rawMatId) {
          const { data: newMat, error: err1 } = await supabase.from("products").insert([{
            name: rawMaterialInputValue,
            category: "raw_material",
            current_stock: rawMaterialQty,
            low_stock_threshold: Math.ceil(rawMaterialQty * 0.1),
          }]).select("id,name,category,current_stock").single();
          if (err1) throw err1;
          rawMatId = newMat.id;
        }

        // Create finished product if doesn't exist
        if (!finProdId) {
          const { data: newProd, error: err2 } = await supabase.from("products").insert([{
            name: finishedProductInputValue,
            category: "finished_product",
            current_stock: finishedProductQty,
            low_stock_threshold: Math.ceil(finishedProductQty * 0.1),
          }]).select("id,name,category,current_stock").single();
          if (err2) throw err2;
          finProdId = newProd.id;
        }

        const response = await fetch("/api/production-run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawMaterialId: rawMatId,
            rawMaterialQuantity: rawMaterialQty,
            finishedProductId: finProdId,
            finishedProductQuantity: finishedProductQty,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "שגיאה בשרת");
        }

        const data = await response.json();
        setResult(data.productionRun);
      }

      setSelectedRawMaterial("");
      setRawMaterialInputValue("");
      setRawMaterialQty(0);
      setSelectedFinishedProduct("");
      setFinishedProductInputValue("");
      setFinishedProductQty(0);
      setBomIngredients([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedFP = finishedProducts.find(p => p.id === selectedFinishedProduct);
  const theoreticalWeight = selectedFP ? finishedProductQty * (selectedFP.weight_per_unit || 0) : 0;
  const estimatedWaste = Math.max(0, rawMaterialQty - theoreticalWeight);

  return (
    <div className="mt-6 grid gap-6 sm:grid-cols-2">
      {/* Form */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">טופס הרצת ייצור</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium">בחר או הקלד חומר גלם</label>
            <input
              required
              placeholder="הקלד שם חומר גלם..."
              value={rawMaterialInputValue}
              onChange={e => {
                const text = e.target.value;
                setRawMaterialInputValue(text);
                const material = rawMaterials.find(m => m.name === text);
                if (material) {
                  setSelectedRawMaterial(material.id);
                } else {
                  setSelectedRawMaterial("");
                }
              }}
              list="raw-materials-list"
              className="mt-1 w-full rounded-md border px-2 py-1"
            />
            <datalist id="raw-materials-list">
              {rawMaterials.map(m => (
                <option key={m.id} value={m.name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium">כמות חומר גלם (ק"ג)</label>
            <input
              required
              type="number"
              step="0.01"
              value={rawMaterialQty}
              onChange={e => setRawMaterialQty(Number(e.target.value || 0))}
              className="mt-1 w-full rounded-md border px-2 py-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">בחר או הקלד מוצר סופי</label>
            <input
              required
              placeholder="הקלד שם מוצר..."
              value={finishedProductInputValue}
              onChange={e => {
                const text = e.target.value;
                setFinishedProductInputValue(text);
                const product = finishedProducts.find(p => p.name === text);
                if (product) {
                  setSelectedFinishedProduct(product.id);
                  loadBOM(product.id);
                } else {
                  setSelectedFinishedProduct("");
                  setBomIngredients([]);
                  setUseBOM(false);
                }
              }}
              list="finished-products-list"
              className="mt-1 w-full rounded-md border px-2 py-1"
            />
            <datalist id="finished-products-list">
              {finishedProducts.map(p => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium">כמות מוצרים סופיים (יחידות)</label>
            <input
              required
              type="number"
              value={finishedProductQty}
              onChange={e => setFinishedProductQty(Number(e.target.value || 0))}
              className="mt-1 w-full rounded-md border px-2 py-1"
            />
          </div>

          {useBOM && bomIngredients.length > 0 && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
              <h3 className="font-semibold text-amber-900 mb-3">חומרי גלם דרושים (מתכון)</h3>
              <div className="space-y-2">
                {bomIngredients.map((ingredient, idx) => (
                  <div key={ingredient.material_id} className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 flex-1">{ingredient.material_name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-500">{ingredient.required_quantity}</span>
                      <span className="text-xs text-slate-500">ק"ג</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={ingredient.user_input_quantity || ""}
                      onChange={e => {
                        const newIngredients = [...bomIngredients];
                        newIngredients[idx].user_input_quantity = Number(e.target.value || 0);
                        setBomIngredients(newIngredients);
                      }}
                      className="w-20 rounded border px-2 py-1 text-sm"
                    />
                    <span className="text-xs text-slate-500 w-8">ק"ג</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="rounded-md bg-red-50 p-2 text-sm text-rose-700">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "מעבד..." : "הרץ הייצור"}
          </button>
        </form>
      </div>

      {/* Preview & Results */}
      <div className="space-y-4">
        {/* Preview */}
        <div className="rounded-lg border p-4 bg-blue-50">
          <h3 className="mb-3 font-semibold">תקדום חישוב</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">כמות חומר גלם:</span>
              <span className="font-medium">{rawMaterialQty} ק"ג</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">משקל תיאורטי:</span>
              <span className="font-medium">{theoreticalWeight.toFixed(3)} ק"ג</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">בזבוז משוער:</span>
              <span className="font-medium text-orange-600">{estimatedWaste.toFixed(3)} ק"ג</span>
            </div>
            {rawMaterialQty > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">אחוז בזבוז:</span>
                <span className="font-medium text-orange-600">
                  {((estimatedWaste / rawMaterialQty) * 100).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Result Card */}
        {result && (
          <div className="rounded-lg border p-4 bg-emerald-50">
            <h3 className="mb-3 font-semibold text-emerald-900">הרצה הושלמה בהצלחה!</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">חומר גלם:</span>
                <span className="font-medium">{result.rawMaterialName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">מוצר סופי:</span>
                <span className="font-medium">{result.finishedProductName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">יחידות יצור:</span>
                <span className="font-medium">{result.finished_product_quantity}</span>
              </div>
              <div className="border-t border-emerald-200 pt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-emerald-900">בזבוז בפועל:</span>
                  <span className="font-bold text-lg text-orange-600">{result.waste_quantity.toFixed(3)} ק"ג</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-emerald-900">אחוז בזבוז:</span>
                  <span className="font-bold text-lg text-orange-600">{result.waste_percentage.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
