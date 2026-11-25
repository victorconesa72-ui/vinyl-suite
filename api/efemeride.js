// Efeméride musical del día para el reloj AWTRIX (Ulanzi TC002).
// GET /api/efemeride?d=YYYY-MM-DD[&ascii=1]
// El reloj la pide al encenderse. La respuesta se guarda en la caché de Vercel
// un día por fecha, así que Claude se consulta como mucho una vez al día.

const MODEL = 'claude-opus-4-5';
const DISCOGS_TOKEN = 'OaIBaINfVTOtDcDutdCJLoQiaomGvctptDQSiaMd';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function hoyMadrid(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(d); // YYYY-MM-DD
}

// Extrae el array COL de index.html respetando cadenas con corchetes dentro
function extraerColeccion(html) {
  const ini = html.indexOf('const COL=');
  if (ini < 0) return [];
  let i = html.indexOf('[', ini), depth = 0, inStr = false, esc = false;
  for (let j = i; j < html.length; j++) {
    const c = html[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '[') depth++;
    else if (c === ']' && --depth === 0) {
      try { return JSON.parse(html.slice(i, j + 1)); } catch { return []; }
    }
  }
  return [];
}

const limpiarArtista = a => String(a || '').replace(/\s*\(\d+\)/g, '').trim();
const sinTildes = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

async function portada(id) {
  if (!id) return null;
  try {
    const r = await fetch('https://api.discogs.com/releases/' + id, {
      headers: { Authorization: 'Discogs token=' + DISCOGS_TOKEN, 'User-Agent': 'VinylSuite/1.0' }
    });
    if (!r.ok) return null;
    const d = await r.json();
    const img = (d.images || [])[0];
    return img ? (img.uri150 || img.uri) : null;
  } catch { return null; }
}

function extraerJSON(texto) {
  const a = texto.indexOf('{'), b = texto.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(texto.slice(a, b + 1)); } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const fail = (code, msg) => {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(code).json({ error: msg });
  };

  const d = String(req.query.d || hoyMadrid());
  // Solo ayer, hoy o mañana: evita que alguien gaste consultas con fechas inventadas
  if (![hoyMadrid(-1), hoyMadrid(0), hoyMadrid(1)].includes(d)) return fail(400, 'fecha no válida');
  const ascii = req.query.ascii === '1';
  const [, mm, dd] = d.split('-').map(Number);
  const fechaTxt = `${dd} de ${MESES[mm - 1]}`;

  try {
    // Colección actual, leída del propio index.html desplegado
    const html = await (await fetch(`https://${req.headers.host}/`)).text();
    const col = extraerColeccion(html);
    const lista = col.map(r => `${limpiarArtista(r.a)} — ${r.t}${r.y ? ' (' + r.y + ')' : ''} [${r.id}]`).join('\n');

    const prompt =
`Hoy es ${fechaTxt}. Busca UNA efeméride musical real de este día (${fechaTxt}, de cualquier año): publicación de un disco, nacimiento o muerte de un artista, una grabación o un concierto histórico.

Prioridad: que tenga que ver con un artista o disco de esta colección de vinilos. Si no encuentras ninguna verificable para esta fecha, elige una efeméride relevante de un artista de géneros parecidos (pop y rock español, soul, jazz, pop internacional de los 70-80).

Verifica la fecha con la búsqueda web. No inventes nada: si no estás seguro de que ocurrió exactamente el ${fechaTxt}, busca otra.

Colección (artista — disco (año) [id de Discogs]):
${lista}

Responde SOLO con un objeto JSON, sin texto antes ni después:
{"texto": "frase en español de 60 a 130 caracteres, que empiece por el año, p. ej. '1977: Fleetwood Mac publica Rumours... y está en tu estantería'", "artista": "nombre", "anio": 1977, "en_coleccion": true, "discogs_id": 16158797}
Si la efeméride es de un disco concreto de la colección, pon su id en discogs_id; si es de un artista de la colección pero no de un disco concreto, pon el id de uno de sus discos; si no, null.`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }],
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await r.json();
    if (!r.ok) return fail(502, data?.error?.message || 'error de Claude');

    const texto = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const ef = extraerJSON(texto);
    if (!ef || !ef.texto) return fail(502, 'respuesta sin efeméride');

    let id = Number(ef.discogs_id) || null;
    if (id && !col.some(x => x.id === id)) id = null;   // solo portadas de discos que tienes
    const cover = await portada(id);

    let frase = String(ef.texto).replace(/\s+/g, ' ').trim().slice(0, 160);
    let artista = limpiarArtista(ef.artista);
    if (ascii) { frase = sinTildes(frase); artista = sinTildes(artista); }

    // Un día en la caché de Vercel para esta fecha concreta
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
    return res.status(200).json({
      fecha: d,
      texto: frase,
      artista,
      anio: Number(ef.anio) || null,
      en_coleccion: !!ef.en_coleccion,
      portada: cover
    });
  } catch (e) {
    return fail(500, e.message);
  }
}
