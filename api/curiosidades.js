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

    // Try models in order until one works
    const models = ['gemini-1.5-flash-latest', 'gemini-1.5-flash-001', 'gemini-1.0-pro'];
    let text = '';
    let lastError = null;

    for (const model of models) {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text) break;
      lastError = data.error;
    }

    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return res.status(200).json({
      content: [{ type: 'text', text: clean }],
      _debug: { textLen: text.length, error: lastError }
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
