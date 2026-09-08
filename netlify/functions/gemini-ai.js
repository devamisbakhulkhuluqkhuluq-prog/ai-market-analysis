exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    try {
        const { prompt, pair } = JSON.parse(event.body);
        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) throw new Error("API Key hilang. Cek Environment Variables di Netlify.");

        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const systemInstruction = `Kamu adalah analis Forex profesional untuk pair ${pair}. Jawab singkat, padat, dan gunakan format Markdown (heading, bold, bullet point). Selalu sertakan disclaimer risiko trading.`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 detik, di bawah limit Netlify

        const response = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
                generationConfig: {
                    maxOutputTokens: 800,
                    temperature: 0.7
                }
            })
        });
        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || `Gemini API Error: ${response.status}`);
        }

        if (!data.candidates || !data.candidates[0]) {
            throw new Error("Gemini tidak memberikan jawaban: " + JSON.stringify(data));
        }

        const candidate = data.candidates[0];

        if (candidate.finishReason === 'SAFETY') {
            throw new Error("Permintaan diblokir oleh filter keamanan Gemini. Coba ubah kata-kata prompt Anda.");
        }

        if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
            throw new Error("Respons AI kosong atau tidak dikenali.");
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reply: candidate.content.parts[0].text })
        };
    } catch (error) {
        const msg = error.name === 'AbortError'
            ? 'Request timeout: Gemini API terlalu lama merespons. Coba lagi.'
            : error.message;
        return { statusCode: 500, body: JSON.stringify({ reply: msg }) };
    }
};