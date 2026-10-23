import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || searchParams.get('code');

  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return new NextResponse('Invalid icon ID', { status: 400 });
  }

  const localPath = path.join(process.cwd(), 'public', 'services', `${id}.svg`);
  
  // 1. Return from local storage if available
  if (fs.existsSync(localPath)) {
    const content = fs.readFileSync(localPath, 'utf8');
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=604800, immutable',
      },
    });
  }

  // 2. Fallback: Proxy server-side from provider without exposing origin
  try {
    const upstreamUrl = `https://smsbower.app/img/services/${id}.svg`;
    const res = await fetch(upstreamUrl, { cache: 'no-store' });
    if (!res.ok) {
      return new NextResponse('Icon not found', { status: 404 });
    }
    const svgText = await res.text();
    
    // Save locally for future requests
    try {
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(localPath, svgText);
    } catch { /* ignore disk write error */ }

    return new NextResponse(svgText, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=604800, immutable',
      },
    });
  } catch (err) {
    return new NextResponse('Failed to load icon', { status: 500 });
  }
}
