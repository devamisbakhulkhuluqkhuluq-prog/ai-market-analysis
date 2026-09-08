exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { prompt, pair } = JSON.parse(event.body);
        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) {
            throw new Error("API Key hilang. Cek Environment Variables di Netlify.");
        }

        const geminiEndpoint = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-001:generateContent?key=' + API_KEY;

        const currentTime = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

        const systemInstruction = `Kamu adalah seorang analis Forex fundamental dan teknikal profesional yang ahli dalam membaca rilis data makroekonomi (NFP, CPI, Suku Bunga, GDP, dll).
Saat ini user sedang menganalisa pair ${pair}.
INFO WAKTU REAL-TIME: ${currentTime} WIB.

Tugasmu adalah menganalisis skenario "Jika/Maka" berdasarkan data yang dimasukkan user (Previous, Forecast, dan Actual):
1. Analisis Deviasi: Hitung selisih atau tingkat kejutan (surprise) antara Actual dan Forecast.
2. Reaksi Market: Jelaskan bagaimana respons mata uang terkait (apakah menguat/bullish atau melemah/bearish).
3. Skenario Aksi: Berikan proyeksi arah harga, level support/resistance yang berpotensi ditembus, dan tips manajemen risiko.

Gunakan format poin-poin yang rapi, profesional, mudah dibaca, dan selalu sertakan disclaimer bahwa trading forex memiliki risiko tinggi.`;

        const requestBody = {
            contents: [{
                role: "user",
                parts: [{ text: systemInstruction + "\n\nKondisi Market: " + prompt }]
            }]
        };

        const response = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error((data.error && data.error.message) || ("Gemini API Error: " + response.status));
        }

        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("Respons kosong dari Gemini. Raw: " + JSON.stringify(data));
        }

        const candidate = data.candidates[0];

        if (candidate.finishReason === 'SAFETY') {
            throw new Error("Permintaan ditolak Gemini karena filter keamanan. Coba ubah kata-kata prompt Anda.");
        }

        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            throw new Error("Format respons AI tidak dikenali. FinishReason: " + candidate.finishReason);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ reply: candidate.content.parts[0].text })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ reply: "Error: " + error.message })
        };
    }
};