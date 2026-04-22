export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { messages = [] } = req.body;
    const userMessage = messages.find(m => m.role === 'user');
    let prompt = userMessage ? userMessage.content : '';

    // Force strict JSON output
    if (!prompt.includes('IMPORTANTE')) {
      prompt += '\n\nIMPORTANTE: Responde ÚNICAMENTE con el objeto JSON, sin texto adicional, sin markdown, sin explicaciones. Solo el JSON puro empezando por { y terminando por }.';
    }

    const apiKey = process.env.GEMINI_API_KEY;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
            stopSequences: []
          }
        })
      }
    );

    const data = await geminiRes.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean and extract JSON
    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      text = text.slice(start, end + 1);
    }

    return res.status(200).json({
      content: [{ type: 'text', text }]
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
