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
  const artist = url.searchParams.get('artist') || '';
  const title = url.searchParams.get('title') || '';

  try {
    // Get access token
    const creds = btoa('cd16a19cbec340b796c0eaa7d80b7ac1:2769d0b459a2487486bfb301a2b9a7af');
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + creds,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;

    // Search album
    const q = encodeURIComponent(`album:${title} artist:${artist}`);
    const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=album&limit=1`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const searchData = await searchRes.json();
    const album = searchData.albums?.items?.[0];

    if (!album) {
      return new Response(JSON.stringify({ id: null }), { headers });
    }

    return new Response(JSON.stringify({
      id: album.id,
      name: album.name,
      url: album.external_urls?.spotify
    }), { headers });

  } catch(e) {
    return new Response(JSON.stringify({ id: null, error: e.message }), { status: 500, headers });
  }
}
