import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json();
    if (typeof path !== 'string' || path.length === 0) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }
    revalidatePath(path);
    return NextResponse.json({ revalidated: true, path });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to revalidate' }, { status: 500 });
  }
}
