import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url') || '';

  let imageUrl;
  try {
    imageUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid image URL.' }, { status: 400 });
  }

  if (imageUrl.protocol !== 'https:') {
    return NextResponse.json({ error: 'Only HTTPS images can be proxied.' }, { status: 400 });
  }

  const response = await fetch(imageUrl, {
    headers: {
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
    }
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Could not load image.' }, { status: response.status });
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('image/')) {
    return NextResponse.json({ error: 'URL did not return an image.' }, { status: 400 });
  }

  return new NextResponse(await response.arrayBuffer(), {
    headers: {
      'Cache-Control': 'private, max-age=300',
      'Content-Type': contentType
    }
  });
}
