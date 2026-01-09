"use client";
import React, { useEffect, useState } from "react";
import supabase from "../../lib/supabaseClient";

type Product = {
  id: string;
  name: string;
  category?: string;
  unit_type?: string;
  selling_price?: number;
};

type Recipe = {
  id: string;
  finished_product_id: string;
  raw_material_id: string;
  required_quantity: number;
  unit_type?: string;
  raw_material_name?: string;
};

export default function RecipesPage() {
  const [finishedProducts, setFinishedProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // Separate into categories based on naming or hardcoded list
        // Since we can't read category reliably, we'll separate by querying separately
        const { data: finProd, error: finErr } = await supabase.from("products").select("id,name,selling_price").eq("category", "finished_product");
        if (finErr) throw new Error(`Failed to load finished products: ${finErr.message}`);
        
        const { data: rawMat, error: rawErr } = await supabase.from("products").select("id,name,unit_type").eq("category", "raw_material");
        if (rawErr) throw new Error(`Failed to load raw materials: ${rawErr.message}`);
        
        setFinishedProducts(finProd ?? []);
        setRawMaterials(rawMat ?? []);
        
        const { data: recs, error: recErr } = await supabase.from("product_recipes").select("id,finished_product_id,raw_material_id,required_quantity,unit_type");
        if (recErr) throw new Error(`Failed to load recipes: ${recErr.message}`);
        
        setRecipes(recs ?? []);
      } catch (error: any) {
        console.error("Error loading recipes data:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">מתכונים (BOM)</h1>
        <p className="text-sm text-slate-600">הגדר אילו חומרי גלם עושים כל מוצר</p>
      </div>

      {loading ? (
        <div className="mt-4 p-4 text-slate-600">טוען...</div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <RecipeEditor 
              finishedProducts={finishedProducts} 
              rawMaterials={rawMaterials} 
              onRecipeAdded={() => {
                // Reload recipes
                (async () => {
                  const { data } = await supabase.from("product_recipes").select("id,finished_product_id,raw_material_id,required_quantity,unit_type");
                  setRecipes(data ?? []);
                })();
              }}
            />
            <RecipesList recipes={recipes} finishedProducts={finishedProducts} rawMaterials={rawMaterials} />
          </div>
          <RecipeFinancials recipes={recipes} finishedProducts={finishedProducts} rawMaterials={rawMaterials} />
        </div>
      )}
    </div>
  );
}

function RecipeEditor({ finishedProducts, rawMaterials, onRecipeAdded }: { finishedProducts: Product[]; rawMaterials: Product[]; onRecipeAdded: () => void }) {
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productInputValue, setProductInputValue] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [materialInputValue, setMaterialInputValue] = useState("");
  const [materialUnitType, setMaterialUnitType] = useState("kg");
  const [quantity, setQuantity] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMaterialObj = rawMaterials.find(m => m.id === selectedMaterial);
  const displayUnitType = selectedMaterialObj?.unit_type || materialUnitType;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productInputValue || !materialInputValue || !quantity) {
      setError("מלא את כל השדות");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let prodId = selectedProduct;
      let matId = selectedMaterial;

      // Create finished product if doesn't exist
      if (!prodId) {
        const { data: newProd, error: err1 } = await supabase.from("products").insert([{
          name: productInputValue,
          category: "finished_product",
          current_stock: 0,
          low_stock_threshold: 0,
        }]).select("id,name,category").single();
        if (err1) throw err1;
        prodId = newProd.id;
      }

      // Create raw material if doesn't exist
      if (!matId) {
        const { data: newMat, error: err2 } = await supabase.from("products").insert([{
          name: materialInputValue,
          category: "raw_material",
          current_stock: 0,
          low_stock_threshold: 0,
          unit_type: materialUnitType,
        }]).select("id,name,category,unit_type").single();
        if (err2) throw err2;
        matId = newMat.id;
      }

      const { error: err } = await supabase.from("product_recipes").insert([{
        finished_product_id: prodId,
        raw_material_id: matId,
        required_quantity: quantity,
        unit_type: displayUnitType,
      }]);
      if (err) throw err;
      setSelectedProduct("");
      setProductInputValue("");
      setSelectedMaterial("");
      setMaterialInputValue("");
      setMaterialUnitType("kg");
      setQuantity(0);
      onRecipeAdded();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border p-4">
      <h2 className="mb-4 text-lg font-semibold">הוסף מתכון חדש</h2>
      <form onSubmit={handleAdd} className="space-y-3">
        <div>
          <label className="block text-sm font-medium">בחר או הקלד מוצר סופי</label>
          <input
            required
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
          <label className="block text-sm font-medium">בחר או הקלד חומר גלם</label>
          <input
            required
            placeholder="הקלד שם חומר..."
            value={materialInputValue}
            onChange={e => {
              const text = e.target.value;
              setMaterialInputValue(text);
              const material = rawMaterials.find(m => m.name === text);
              if (material) {
                setSelectedMaterial(material.id);
              } else {
                setSelectedMaterial("");
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

        {!selectedMaterial && (
          <div>
            <label className="block text-sm font-medium">יחידת מידה (רק חומרי גלם חדשים)</label>
            <select
              value={materialUnitType}
              onChange={e => setMaterialUnitType(e.target.value)}
              className="mt-1 w-full rounded-md border px-2 py-1"
            >
              <option value="kg">ק"ג (ק"ג)</option>
              <option value="liters">ליטרים</option>
              <option value="units">יחידות</option>
              <option value="meters">מטרים</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium">כמות דרושה ({displayUnitType})</label>
          <input
            required
            type="number"
            step="0.001"
            value={quantity}
            onChange={e => setQuantity(Number(e.target.value || 0))}
            className="mt-1 w-full rounded-md border px-2 py-1"
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "שומר..." : "הוסף לתרשימון"}
        </button>
      </form>
    </div>
  );
}

function RecipesList({ recipes, finishedProducts, rawMaterials }: { recipes: Recipe[]; finishedProducts: Product[]; rawMaterials: Product[] }) {
  const getProductName = (id: string) => {
    return finishedProducts.find((p: any) => p.id === id)?.name || id;
  };
  
  const getMaterialName = (id: string) => {
    return rawMaterials.find((m: any) => m.id === id)?.name || id;
  };

  // Group recipes by finished product
  const grouped = finishedProducts.reduce((acc: any, product: any) => {
    acc[product.id] = recipes.filter((r: any) => r.finished_product_id === product.id);
    return acc;
  }, {});

  return (
    <div className="rounded-lg border p-4">
      <h2 className="mb-4 text-lg font-semibold">מתכונים קיימים</h2>
      <div className="space-y-4">
        {Object.entries(grouped).map(([productId, productRecipes]: [string, any]) => {
          if (productRecipes.length === 0) return null;
          return (
            <div key={productId} className="rounded-md bg-slate-50 p-3">
              <div className="font-semibold mb-2">{getProductName(productId)}</div>
              <ul className="space-y-1 text-sm">
                {productRecipes.map((recipe: any) => (
                  <li key={recipe.id} className="flex justify-between">
                    <span>{getMaterialName(recipe.raw_material_id)}</span>
                    <span className="font-medium">{recipe.required_quantity} {recipe.unit_type || 'kg'}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {recipes.length === 0 && <div className="text-slate-500">אין מתכונים עדיין</div>}
      </div>
    </div>
  );
}

function RecipeFinancials({ recipes, finishedProducts, rawMaterials }: { recipes: Recipe[]; finishedProducts: Product[]; rawMaterials: Product[] }) {
  const [costs, setCosts] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCosts = async () => {
      const costMap: { [key: string]: number } = {};

      for (const recipe of recipes) {
        const { data } = await supabase
          .from("inventory_movements")
          .select("price_per_unit")
          .eq("product_id", recipe.raw_material_id)
          .eq("type", "IN")
          .order("date", { ascending: false })
          .limit(1)
          .single();

        const pricePerUnit = data?.price_per_unit || 0;
        const ingredientCost = recipe.required_quantity * pricePerUnit;
        costMap[recipe.finished_product_id] = (costMap[recipe.finished_product_id] || 0) + ingredientCost;
      }

      setCosts(costMap);
      setLoading(false);
    };

    if (recipes.length > 0) {
      loadCosts();
    } else {
      setLoading(false);
    }
  }, [recipes]);

  // Group recipes by finished product and calculate totals
  const groupedByProduct = finishedProducts.reduce((acc: any, product: any) => {
    const productRecipes = recipes.filter((r: any) => r.finished_product_id === product.id);
    if (productRecipes.length > 0) {
      const productionCost = costs[product.id] || 0;
      const sellingPrice = product.selling_price || 0;
      const grossProfit = sellingPrice - productionCost;
      const profitMargin = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;
      const isProfitable = grossProfit > 0;

      acc[product.id] = {
        name: product.name,
        productionCost,
        sellingPrice,
        grossProfit,
        profitMargin,
        isProfitable,
        recipeCount: productRecipes.length,
      };
    }
    return acc;
  }, {});

  return (
    <div className="rounded-lg border p-4 sm:col-span-2">
      <h2 className="mb-4 text-lg font-semibold">💰 ניתוח פרופיטיביות מתכונים</h2>
      {loading ? (
        <div className="text-slate-600 text-sm">טוען...</div>
      ) : Object.keys(groupedByProduct).length === 0 ? (
        <div className="text-slate-500 text-sm">אין מתכונים להצגה</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-3 py-2 text-right font-semibold">מוצר</th>
                <th className="px-3 py-2 text-right font-semibold">עלות ייצור</th>
                <th className="px-3 py-2 text-right font-semibold">מחיר מכירה</th>
                <th className="px-3 py-2 text-right font-semibold">רווח</th>
                <th className="px-3 py-2 text-right font-semibold">שולי רווח %</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedByProduct).map(([prodId, data]: [string, any]) => (
                <tr key={prodId} className={`border-b ${data.isProfitable ? 'bg-green-50' : 'bg-red-50'}`}>
                  <td className="px-3 py-2 font-medium">{data.name}</td>
                  <td className="px-3 py-2">{data.productionCost.toFixed(2)} ₪</td>
                  <td className="px-3 py-2">{data.sellingPrice.toFixed(2)} ₪</td>
                  <td className="px-3 py-2">
                    <span className={data.isProfitable ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {data.grossProfit.toFixed(2)} ₪
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={data.isProfitable ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {data.profitMargin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
