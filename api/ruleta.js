// Ruleta de discos para el reloj AWTRIX (Ulanzi TC002).
// GET /api/ruleta[?n=8][&ascii=1]
// Devuelve n vinilos al azar de la colección de Discogs con su portada pequeña (150 px).
// El reloj los hace girar y frena en el último de la lista.
export const config = { runtime: 'edge' };

const USER = 'veeteen';
const DISCOGS_TOKEN = 'OaIBaINfVTOtDcDutdCJLoQiaomGvctptDQSiaMd';
const H = { Authorization: 'Discogs token=' + DISCOGS_TOKEN, 'User-Agent': 'VinylSuite/1.0' };

const limpiar = a => String(a || '').replace(/\s*\(\d+\)/g, '').trim();
const sinTildes = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

async function pagina(p) {
  const r = await fetch(`https://api.discogs.com/users/${USER}/collection/folders/0/releases?per_page=100&page=${p}`, { headers: H });
  if (!r.ok) throw new Error('Discogs ' + r.status);
  return r.json();
}

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  };
  const url = new URL(req.url);
  const n = Math.min(Math.max(parseInt(url.searchParams.get('n') || '8', 10) || 8, 3), 12);
  const ascii = url.searchParams.get('ascii') === '1';

  try {
    // Primera página para saber cuántas hay; luego otra al azar para variar más
    const p1 = await pagina(1);
    const total = p1.pagination?.pages || 1;
    let items = p1.releases || [];
    if (total > 1) {
      const otra = 2 + Math.floor(Math.random() * (total - 1));
      items = items.concat((await pagina(otra)).releases || []);
    }
    const vinilos = items
      .map(x => x.basic_information || {})
      .filter(b => (b.formats || []).some(f => f.name === 'Vinyl') && b.thumb);

    // Barajar y quedarse con n distintos
    for (let i = vinilos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [vinilos[i], vinilos[j]] = [vinilos[j], vinilos[i]];
    }
    const t = s => (ascii ? sinTildes(s) : s);
    const discos = vinilos.slice(0, n).map(b => ({
      a: t(limpiar((b.artists || [])[0]?.name)),
      t: t(String(b.title || '')),
      y: b.year || 0,
      c: b.thumb,
      id: b.id
    }));
    return new Response(JSON.stringify({ discos }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 502, headers });
  }
}
