const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("node:crypto");
const config = require("../config");
const colors = require("./colors");

// Helper untuk generate format cookie yang dibutuhkan unlimitedai
function buildCookie(deviceId, chatId) {
    return `NEXT_LOCALE=id; u_device_id=${deviceId}; home_chat_id=${chatId}`;
}

module.exports = async (sock, m, chat) => {
    const waktu = colors.chalk.dim(`[${new Date().toLocaleTimeString('id-ID', { hour12: false })}]`);
    const tagAI = colors.chalk.bold.blue("[AI RESPONSE]");

    try {
        // 1. Kirim sinyal "sedang mengetik" ke WhatsApp agar server tahu bot aktif
        await sock.sendPresenceUpdate('composing', chat.sender).catch(() => null);

        let ringkasanProduk = "Produk Digital";
        const dbPath = path.resolve(__dirname, `../${config.pathPricelist}`);
        
        if (fs.existsSync(dbPath)) {
            try {
                const rawData = fs.readFileSync(dbPath, "utf-8");
                const jsonData = JSON.parse(rawData);
                const categories = Object.keys(jsonData);
                if (categories.length > 0) {
                    ringkasanProduk = categories.join(", ");
                }
            } catch (jsonErr) {
                ringkasanProduk = "Kategori Produk Digital";
            }
        }

        // Gabungkan rule system prompt bawaan toko Anda
        const promptSystem = `Toko: ${config.nameCommercial}. Owner: ${config.ownerName}. Jenis Layanan: ${config.typeApp}. Kategori Jualan: ${ringkasanProduk}. Pesan OOT: ${config.replyOot}. Navigasi: Menu (${config.cmdMenu}), Owner (${config.cmdowner}), Order (${config.cmdOrder}), Beli (${config.cmdBuy}). Peran: ${config.context}. Aturan: 1. Jika OOT wajib jawab menggunakan kalimat dari Pesan OOT. 2. Jika tanya harga/beli/layanan arahkan pakai perintah navigasi manual. Jawab santai. User chat: ${chat.body}`;

        console.log(`${waktu} ${tagAI} 📝 Ukuran prompt setelah di-minify: ${promptSystem.length} karakter.`);
        console.log(`${waktu} ${tagAI} ├ 📡 Menembak UnlimitedAI (Reasoning Model)...`);
        const startAI = performance.now();

        // --- PROSES REQUESST KE UNLIMITEDAI ---
        const chatIdUniq = crypto.randomUUID();
        const deviceIdUniq = crypto.randomUUID();
        const createdAt = new Date().toISOString();

        const bodyData = {
            chatId: chatIdUniq,
            messages: [
                {
                    id: crypto.randomUUID(),
                    role: "user",
                    content: promptSystem,
                    parts: [{ type: "text", text: promptSystem }],
                    createdAt,
                }
            ],
            selectedChatModel: "chat-model-reasoning", // Menggunakan model reasoning gratisan mereka
            selectedCharacter: null,
            selectedStory: null,
            deviceId: deviceIdUniq,
            locale: "id",
        };

        // Kirim request via Axios dengan responseType 'stream' untuk membaca delta data
        const response = await axios.post("https://app.unlimitedai.chat/api/chat", bodyData, {
            timeout: 10000, // dinaikkan ke 10 detik karena ini model reasoning (butuh waktu mikir)
            responseType: "stream",
            headers: {
                "sec-ch-ua-platform": `"Android"`,
                "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
                "sec-ch-ua": `"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"`,
                "content-type": "application/json",
                "sec-ch-ua-mobile": "?1",
                "x-next-intl-locale": "id",
                "accept": "*/*",
                "origin": "https://app.unlimitedai.chat",
                "referer": "https://app.unlimitedai.chat/id",
                "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
                "cookie": buildCookie(deviceIdUniq, chatIdUniq),
                "priority": "u=1, i",
            }
        });

        // Satukan data stream chunk demi chunk
        let aiResult = "";
        
        await new Promise((resolve, reject) => {
            let buffer = "";
            response.data.on("data", (chunk) => {
                buffer += chunk.toString("utf8");
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // Simpan sisa baris yang belum lengkap

                for (const rawLine of lines) {
                    const line = rawLine.trim();
                    if (!line) continue;
                    try {
                        const json = JSON.parse(line);
                        if (json.type === "delta" && typeof json.delta === "string") {
                            aiResult += json.delta;
                        }
                    } catch (e) {
                        // Lewati baris jika gagal parse JSON (kadang ada serpihan teks stream)
                    }
                }
            });

            response.data.on("end", () => {
                resolve();
            });

            response.data.on("error", (err) => {
                reject(err);
            });
        });

        const endAI = performance.now();
        console.log(`${waktu} ${tagAI} ├ ⏱️  AI API Processing: ${colors.chalk.yellow((endAI - startAI).toFixed(3) + ' ms')}`);

        // Matikan status mengetik
        await sock.sendPresenceUpdate('paused', chat.sender).catch(() => null);

        if (aiResult && aiResult.trim() !== "") {
            // 3. Pastikan socket dalam kondisi open sebelum kirim pesan
            await sock.sendMessage(chat.sender, { text: aiResult.trim() }, { quoted: m });
            console.log(`${waktu} ${tagAI} └ ✔️  Respon AI berhasil dikirim.`);
        } else {
            console.log(`${waktu} ${tagAI} └ ⚠️  API Sukses tapi response teks kosong.`);
        }

    } catch (err) {
        // Jika error, pastikan status mengetik dimatikan
        await sock.sendPresenceUpdate('paused', chat.sender).catch(() => null);
        console.error(`${waktu} ${colors.chalk.bold.red("[AI ERROR]")} └ ❌ Gagal memproses AI Fallback:`, err.message);
    }
};
