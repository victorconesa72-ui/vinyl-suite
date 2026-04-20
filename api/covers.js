export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { id } = req.query;
  try {
    const r = await fetch('https://api.discogs.com/releases/' + id, {
      headers: {
        'Authorization': 'Discogs token=OaIBaINfVTOtDcDutdCJLoQiaomGvctptDQSiaMd',
        'User-Agent': 'VinylSuite/1.0'
      }
    });
    const d = await r.json();
    const url = d.images?.[0]?.uri || d.thumb || null;
    res.status(200).json({ url });
  } catch(e) {
    res.status(500).json({ url: null });
  }
}
