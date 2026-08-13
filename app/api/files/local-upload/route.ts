import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('file_id');
    const name = searchParams.get('name');
    
    if (!fileId || !name) {
      return NextResponse.json({ error: 'Missing file details' }, { status: 400 });
    }

    const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(UPLOADS_DIR, `${fileId}-${name}`);

    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Local upload error:', error);
    return NextResponse.json({ error: 'Failed to upload locally' }, { status: 500 });
  }
}
