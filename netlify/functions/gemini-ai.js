// Menggunakan export const untuk menyesuaikan dengan aturan ES Module bawaan Vite
export const handler = async (event, context) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    try {
        const { prompt, pair } = JSON.parse(event.body);
        const API_KEY = process.env.GEMINI_API_KEY; 

        if (!API_KEY) throw new Error("API Key hilang. Cek Environment Variables di Netlify.");

        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-3.6-flash:generateContent?key=${API_KEY}`;

        // Mengambil waktu real-time dalam zona waktu Indonesia (WIB)
        const currentTime = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

        // Instruksi sistem yang sudah diperkuat dengan Konteks Waktu & News Trading
        const systemInstruction = `Kamu adalah analis Forex profesional. Saat ini user sedang menganalisa pair ${pair}.
        INFO PENTING: Saat ini adalah tanggal dan waktu: ${currentTime} WIB. Gunakan ini sebagai konteks real-time saat menganalisis berita atau tren terbaru.
        
        Tugasmu:
        1. Jika user memberikan skenario Actual vs Forecast, analisis dampak selisih/deviasinya.
        2. Berikan proyeksi arah harga dan level Support/Resistance.
        3. Jika diminta setup risiko, berikan Entry, SL, dan TP.
        Gunakan format poin-poin yang rapi, profesional, dan selalu sertakan disclaimer risiko trading.`;

        const response = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: `${systemInstruction}\n\nKondisi Market: ${prompt}` }] }]
            })
        });

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0]) {
            throw new Error("Format respons tidak sesuai dari Gemini API: " + JSON.stringify(data));
        }
        
        const candidate = data.candidates[0];
        
        if (candidate.finishReason === 'SAFETY') {
            throw new Error("Permintaan ditolak oleh Gemini API karena melanggar kebijakan keamanan (Safety). Coba gunakan kata-kata yang lebih aman.");
        }
        
        if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
            throw new Error("Respons dari AI kosong atau formatnya tidak dikenali.");
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({ reply: candidate.content.parts[0].text })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ reply: error.message }) };
    }
};