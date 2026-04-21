export const config = { runtime: 'edge' };

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  try {
    const r = await fetch('https://api.discogs.com/releases/' + id, {
      headers: {
        'Authorization': 'Discogs token=OaIBaINfVTOtDcDutdCJLoQiaomGvctptDQSiaMd',
        'User-Agent': 'VinylSuite/1.0'
      }
    });
    const d = await r.json();
    const images = (d.images || []).map(img => img.uri).filter(Boolean);
    const tracklist = (d.tracklist || []).map(t => ({
      pos: t.position,
      title: t.title,
      duration: t.duration
    }));
    return new Response(JSON.stringify({
      url: images[0] || null,
      images,
      tracklist
    }), { headers });
  } catch(e) {
    return new Response(JSON.stringify({ url: null, images: [], tracklist: [] }), { headers });
  }
}
