exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    try {
        const { prompt, pair } = JSON.parse(event.body);
        const API_KEY = process.env.GEMINI_API_KEY; 

        if (!API_KEY) throw new Error("API Key hilang");

        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        // Konteks dinamis untuk AI
        const systemInstruction = `Kamu adalah analis Forex profesional. Saat ini user sedang menganalisa pair ${pair}. 
        Berikan analisa tajam berdasarkan input user. Bagilah menjadi: 1. Pandangan Teknikal, 2. Pandangan Fundamental, 3. Kesimpulan & Rekomendasi (dengan disclaimer risiko).`;

        const response = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: `${systemInstruction}\n\nKondisi Market: ${prompt}` }] }]
            })
        });

        const data = await response.json();
        
        return {
            statusCode: 200,
            body: JSON.stringify({ reply: data.candidates[0].content.parts[0].text })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ reply: error.message }) };
    }
};