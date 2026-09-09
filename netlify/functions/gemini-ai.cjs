const https = require('https');

exports.handler = async (event) => {
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

        const currentTime = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
        const systemInstruction = `Kamu adalah analis Forex profesional. Pair yang dianalisa: ${pair}. Waktu: ${currentTime} WIB.
Berikan analisa padat, ringkas, gunakan poin-poin rapi, dan sertakan disclaimer risiko trading tanpa bertele-tele.`;

        const requestData = JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${systemInstruction}\n\nKondisi Market: ${prompt}` }] }]
        });

        // Pakai native https module agar aman dari masalah 'fetch is not defined' di Node versi lama
        const options = {
            hostname: 'generativelanguage.googleapis.com',
            port: 443,
            path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestData)
            }
        };

        const responseData = await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let rawData = '';
                res.on('data', (chunk) => { rawData += chunk; });
                res.on('end', () => {
                    resolve({ statusCode: res.statusCode, data: rawData });
                });
            });
            req.on('error', (e) => reject(e));
            req.write(requestData);
            req.end();
        });

        const data = JSON.parse(responseData.data);

        if (responseData.statusCode !== 200) {
            return { 
                statusCode: 200, 
                body: JSON.stringify({ reply: `⚠️ Error dari Google (${responseData.statusCode}): ${data.error?.message || "Koneksi gagal"}` }) 
            };
        }
        
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, tidak ada respons dari AI.";

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reply: replyText })
        };

    } catch (error) {
        return { 
            statusCode: 200, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reply: `⚠️ Kesalahan Sistem: ${error.message}` }) 
        };
    }
};
