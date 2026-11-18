// Vinyl Suite · /api/img?u=… — sirve una portada de Discogs con permiso CORS
// para poder dibujarla en la imagen de "Tu año en discos" (solo i.discogs.com)
export const config = { runtime: 'edge' };
export default async function handler(req) {
  const u = new URL(req.url).searchParams.get('u') || '';
  let target;
  try { target = new URL(u); } catch { return new Response('bad url', { status: 400 }); }
  if (target.protocol !== 'https:' || !/(^|\.)discogs\.com$/.test(target.hostname)) return new Response('forbidden', { status: 403 });
  const r = await fetch(target.toString(), { headers: { 'User-Agent': 'VinylSuite/1.0' } });
  if (!r.ok) return new Response('upstream ' + r.status, { status: 502 });
  return new Response(r.body, { headers: {
    'Content-Type': r.headers.get('content-type') || 'image/jpeg',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=86400',
  } });
}
