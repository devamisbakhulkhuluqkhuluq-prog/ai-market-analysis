export const handler = async (event) => {
    // 1. Tangkal request yang bukan POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body);
        const prompt = body.prompt;
        const pair = body.pair || "Market";
        const API_KEY = process.env.GEMINI_API_KEY; 

        if (!API_KEY) {
            return { statusCode: 200, body: JSON.stringify({ reply: "⚠️ API Key belum terbaca oleh Netlify." }) };
        }

        // 2. Menggunakan model gemini-1.5-flash (Model paling cepat & resmi dari Google saat ini)
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
        const currentTime = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

        const systemInstruction = `Kamu adalah analis Forex profesional. Pair yang dianalisa: ${pair}. Waktu: ${currentTime} WIB.
        Berikan analisa padat, ringkas, gunakan poin-poin rapi, dan sertakan disclaimer risiko trading tanpa bertele-tele.`;

        // 3. Memanggil API Google
        const response = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: `${systemInstruction}\n\nKondisi Market: ${prompt}` }] }]
            })
        });

        const data = await response.json();

        // 4. Menangani jika API Google mengembalikan pesan error (bukan crash)
        if (!response.ok) {
            return { 
                statusCode: 200, 
                body: JSON.stringify({ reply: `⚠️ Error dari Google: ${data.error?.message || "Koneksi gagal"}` }) 
            };
        }
        
        // 5. Mengambil hasil teks
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, tidak ada respons dari AI.";

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reply: replyText })
        };

    } catch (error) {
        // Mencegah error 502/504 dengan menangkap semua crash ke dalam status 200
        return { 
            statusCode: 200, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reply: `⚠️ Kesalahan Sistem: ${error.message}` }) 
        };
    }
};