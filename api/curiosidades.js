export const config = { runtime: 'edge' };

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    const body = await req.json();
    const messages = body.messages || [];
    const userMessage = messages.find(m => m.role === 'user');
    const prompt = userMessage ? userMessage.content : '';

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024
          }
        })
      }
    );

    const data = await response.json();
    
    // Log full response for debugging
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '';
    
    // Clean markdown fences if present
    const clean = text.replace(/```json\s*/g,'').replace(/```\s*/g,'').trim();

    return new Response(JSON.stringify({
      content: [{ type: 'text', text: clean }],
      debug: { finishReason: candidate?.finishReason, textLength: text.length }
    }), { headers });

  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
