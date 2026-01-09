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
    const { customerName, docNumber, items } = body;

    if (!customerName || !docNumber || !items || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create shipping document
    const { data: shippingDoc, error: docError } = await supabase
      .from('shipping_docs')
      .insert([{
        customer_name: customerName,
        doc_number: docNumber,
        status: 'COMPLETED',
      }])
      .select()
      .single();

    if (docError) {
      return NextResponse.json({ error: docError.message }, { status: 500 });
    }

    // Process each item: insert to shipping_items and update product stock
    for (const item of items) {
      const { productId, quantity } = item;

      // Get product
      const { data: product, error: pError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (pError || !product) {
        return NextResponse.json({ error: `Product ${productId} not found` }, { status: 404 });
      }

      // Check sufficient stock
      if (product.current_stock < quantity) {
        return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 400 });
      }

      // Insert shipping item
      const { error: siError } = await supabase
        .from('shipping_items')
        .insert([{
          doc_id: shippingDoc.id,
          product_id: productId,
          quantity,
        }]);

      if (siError) {
        return NextResponse.json({ error: siError.message }, { status: 500 });
      }

      // Decrease stock for finished product
      const { error: stockError } = await supabase
        .from('products')
        .update({ current_stock: product.current_stock - quantity })
        .eq('id', productId);

      if (stockError) {
        return NextResponse.json({ error: stockError.message }, { status: 500 });
      }

      // Create OUT movement for tracking
      await supabase.from('movements').insert([{
        product_id: productId,
        type: 'OUT',
        quantity,
        notes: `Shipping Doc: ${docNumber}`,
      }]);
    }

    // Revalidate dashboard after shipping movement
    revalidatePath('/');

    return NextResponse.json({
      success: true,
      message: 'Shipment recorded successfully',
      docId: shippingDoc.id,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
