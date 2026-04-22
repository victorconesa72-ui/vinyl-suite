export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { messages = [] } = req.body;
    const userMessage = messages.find(m => m.role === 'user');
    const prompt = userMessage ? userMessage.content : '';
    const apiKey = process.env.GEMINI_API_KEY;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        })
      }
    );

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    return res.status(200).json({
      content: [{ type: 'text', text: clean }],
      _d: { status: geminiRes.status, len: text.length, err: data.error?.message }
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
