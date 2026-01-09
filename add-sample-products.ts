// Script to add sample products to Supabase
import supabase from "./lib/supabaseClient";

async function addProducts() {
  // Raw materials
  const rawMaterials = [
    { name: "ניירות PLA", category: "raw_material", current_stock: 1000, low_stock_threshold: 100, weight_per_unit: null },
    { name: "ניירות קרטון", category: "raw_material", current_stock: 800, low_stock_threshold: 80, weight_per_unit: null },
    { name: "דבק אקולוגי", category: "raw_material", current_stock: 500, low_stock_threshold: 50, weight_per_unit: null },
    { name: "צבע טבעי", category: "raw_material", current_stock: 300, low_stock_threshold: 30, weight_per_unit: null },
    { name: "חומר ריפוד", category: "raw_material", current_stock: 600, low_stock_threshold: 60, weight_per_unit: null },
  ];

  // Finished products
  const finishedProducts = [
    { name: "קעריה 250ml", category: "finished_product", current_stock: 500, low_stock_threshold: 50, weight_per_unit: 0.12 },
    { name: "צלחת 150mm", category: "finished_product", current_stock: 800, low_stock_threshold: 100, weight_per_unit: 0.15 },
    { name: "כוס 200ml", category: "finished_product", current_stock: 300, low_stock_threshold: 30, weight_per_unit: 0.08 },
    { name: "מכסה קעריה", category: "finished_product", current_stock: 600, low_stock_threshold: 60, weight_per_unit: 0.05 },
    { name: "קופסה אריזה", category: "finished_product", current_stock: 400, low_stock_threshold: 40, weight_per_unit: 0.20 },
  ];

  try {
    // Add raw materials
    const { error: rawErr } = await supabase.from("products").insert(rawMaterials);
    if (rawErr) console.error("Error adding raw materials:", rawErr);
    else console.log("✓ Raw materials added");

    // Add finished products
    const { error: finErr } = await supabase.from("products").insert(finishedProducts);
    if (finErr) console.error("Error adding finished products:", finErr);
    else console.log("✓ Finished products added");

    console.log("Done!");
  } catch (err) {
    console.error("Error:", err);
  }
}

addProducts();
