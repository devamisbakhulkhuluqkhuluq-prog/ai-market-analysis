exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    try {
        const { prompt, pair } = JSON.parse(event.body);
        const API_KEY = process.env.GEMINI_API_KEY; 

        if (!API_KEY) throw new Error("API Key hilang");

        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        // Konteks dinamis untuk AI
        const systemInstruction = `Kamu adalah seorang analis Forex fundamental dan teknikal profesional yang ahli dalam membaca rilis data makroekonomi (NFP, CPI, Suku Bunga, GDP, dll).
Saat ini user sedang menganalisa pair ${pair}.

Tugasmu adalah menganalisis skenario "Jika/Maka" berdasarkan data yang dimasukkan user (Previous, Forecast, dan Actual):
1. **Analisis Deviasi:** Hitung selisih atau tingkat kejutan (surprise) antara Actual dan Forecast.
2. **Reaksi Market:** Jelaskan bagaimana respons mata uang terkait (apakah menguat/bullish atau melemah/bearish).
3. **Skenario Aksi:** Berikan proyeksi arah harga, level support/resistance yang berpotensi ditembus, dan tips manajemen risiko.

Gunakan format poin-poin yang rapi, profesional, mudah dibaca, dan selalu sertakan disclaimer bahwa trading forex memiliki risiko tinggi.`;

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