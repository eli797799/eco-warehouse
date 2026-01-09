import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
    }
    const body = await req.json();
    const { rawMaterialId, rawMaterialQuantity, finishedProductId, finishedProductQuantity } = body;

    if (!rawMaterialId || !finishedProductId || !rawMaterialQuantity || !finishedProductQuantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch finished product to get weight_per_unit
    const { data: finishedProduct, error: fpError } = await supabase
      .from('products')
      .select('*')
      .eq('id', finishedProductId)
      .single();

    if (fpError || !finishedProduct) {
      return NextResponse.json({ error: 'Finished product not found' }, { status: 404 });
    }

    // Fetch raw material product
    const { data: rawMaterial, error: rmError } = await supabase
      .from('products')
      .select('*')
      .eq('id', rawMaterialId)
      .single();

    if (rmError || !rawMaterial) {
      return NextResponse.json({ error: 'Raw material not found' }, { status: 404 });
    }

    // Calculate waste
    const theoreticalOutputWeight = finishedProductQuantity * (finishedProduct.weight_per_unit || 0);
    const wasteQuantity = rawMaterialQuantity - theoreticalOutputWeight;
    const wastePercentage = rawMaterialQuantity > 0 ? (wasteQuantity / rawMaterialQuantity) * 100 : 0;

    // Create production run record
    const { data: productionRun, error: prError } = await supabase
      .from('production_runs')
      .insert([{
        raw_material_id: rawMaterialId,
        raw_material_quantity: rawMaterialQuantity,
        finished_product_id: finishedProductId,
        finished_product_quantity: finishedProductQuantity,
        theoretical_output_weight: theoreticalOutputWeight,
        waste_quantity: wasteQuantity,
        waste_percentage: wastePercentage,
      }])
      .select()
      .single();

    if (prError) {
      return NextResponse.json({ error: prError.message }, { status: 500 });
    }

    // Update stocks: decrease raw material, increase finished product
    const { error: rmStockError } = await supabase
      .from('products')
      .update({ current_stock: rawMaterial.current_stock - rawMaterialQuantity })
      .eq('id', rawMaterialId);

    if (rmStockError) {
      return NextResponse.json({ error: rmStockError.message }, { status: 500 });
    }

    const { error: fpStockError } = await supabase
      .from('products')
      .update({ current_stock: finishedProduct.current_stock + finishedProductQuantity })
      .eq('id', finishedProductId);

    if (fpStockError) {
      return NextResponse.json({ error: fpStockError.message }, { status: 500 });
    }

    // Revalidate dashboard so fresh stock renders
    revalidatePath('/');

    // Return the production run with calculated waste
    return NextResponse.json({
      success: true,
      productionRun: {
        ...productionRun,
        rawMaterialName: rawMaterial.name,
        finishedProductName: finishedProduct.name,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
