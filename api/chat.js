// NICO v8 — Proxy Vercel → Gemini Flash
// Archivo: api/chat.js
 
const SYSTEM_PROMPT = `Eres NICO, un asistente especializado en ELECTRÓNICA. Tienes 25 años, eres directo, didáctico y apasionado por la electrónica. Nunca humillas al usuario por hacer preguntas básicas.
 
REGLA DE RESPUESTA OBLIGATORIA — siempre sigue esta estructura:
1. QUÉ ES: definición clara y concisa
2. PARA QUÉ SIRVE: aplicaciones prácticas
3. CÓMO SE USA / MIDE / PROTEGE / ARREGLA: pasos concretos
 
NIVELES DE USUARIO (adáptate automáticamente):
- Nivel 0-2 (principiante): lenguaje simple, analogías cotidianas, sin fórmulas complejas
- Nivel 3-4 (intermedio): fórmulas básicas, ejemplos con valores reales
- Nivel 5-6 (avanzado): fórmulas completas, análisis de circuitos, parámetros de datasheets
- Nivel 7 (preingeniería): transformadas, análisis en frecuencia, modelos de pequeña señal — SIEMPRE añade: "Nota: estas respuestas son orientativas, consulta bibliografía especializada para aplicaciones críticas"
 
NORMAS:
- Habla SIEMPRE en español
- Sé conciso pero completo
- Si no sabes algo, dilo claramente
- Nunca inventes valores o especificaciones técnicas
- Para cálculos, muestra siempre el proceso paso a paso
- Usa unidades del SI correctamente (Ω, V, A, F, H, Hz, W)`;
 
export default async function handler(req, res) {
  // CORS — permite cualquier origen (necesario para Blogger)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
 
  // Respuesta preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
 
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
 
  try {
    const { mensaje, historial = [] } = req.body;
 
    if (!mensaje || typeof mensaje !== 'string') {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }
 
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key no configurada' });
    }
 
    // Construir historial para Gemini
    const contents = [];
    for (const msg of historial) {
      if (msg.role && msg.texto) {
        contents.push({
          role: msg.role === 'nico' ? 'model' : 'user',
          parts: [{ text: msg.texto }]
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: mensaje }]
    });
 
    // Llamada a Gemini 2.5 Flash
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
            topP: 0.8
          }
        })
      }
    );
 
    if (!geminiRes.ok) {
      const error = await geminiRes.text();
      console.error('Gemini error:', error);
      return res.status(502).json({ error: 'Error en la API de Gemini' });
    }
 
    const data = await geminiRes.json();
    const respuesta = data?.candidates?.[0]?.content?.parts?.[0]?.text;
 
    if (!respuesta) {
      return res.status(502).json({ error: 'Respuesta vacía de Gemini' });
    }
 
    return res.status(200).json({ respuesta });
 
  } catch (err) {
    console.error('Error proxy NICO:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
 
