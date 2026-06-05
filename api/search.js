export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });

  try {
    // Search by barcode first, then by text
    const isBarcode = /^\d{8,14}$/.test(q.trim());
    const endpoint = isBarcode
      ? `https://api.discogs.com/database/search?barcode=${encodeURIComponent(q)}&type=release`
      : `https://api.discogs.com/database/search?q=${encodeURIComponent(q)}&type=release`;

    const r = await fetch(endpoint, {
      headers: {
        'Authorization': 'Discogs token=OaIBaINfVTOtDcDutdCJLoQiaomGvctptDQSiaMd',
        'User-Agent': 'VinylSuite/1.0'
      }
    });
    const data = await r.json();
    return res.status(200).json({ results: data.results || [] });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
