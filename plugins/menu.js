const config = require('../config');
const fs = require('fs');
const path = require('path');

module.exports = async (sock, m, chat) => {
    const { command, sender, prefix } = chat;

    if (!['menu', 'help', 'start'].includes(command)) return;

    console.log(`[DEBUG] Menu trigger detected from: ${sender}`);

    try {
        const botName = config.botName || "RYUU CS";
        
        // Cek path gambar
        const imagePath = path.join(process.cwd(), 'assets', 'images', 'menu.jpg');
        let imageBuffer = null;
        if (fs.existsSync(imagePath)) {
            console.log(`[DEBUG] Image found at ${imagePath}`);
            imageBuffer = fs.readFileSync(imagePath);
        } else {
            console.log(`[DEBUG] No image found, switching to text mode.`);
        }

        let menuText = `Selamat Datang di *${botName}* 🤖\n`;
        menuText += `Halo @${sender.split('@')[0]}, ada yang bisa kami bantu?\n\n`;
        menuText += `1️⃣ *.order* (Cek Pricelist)\n`;
        menuText += `2️⃣ *.rules* (Peraturan Bot)\n`;
        menuText += `3️⃣ *.owner* (Hubungi Admin)\n\n`;
        menuText += `_Gunakan menu di atas untuk layanan cepat._`;

        // Kita coba pake struktur sendMessage yang paling stabil (Text with AdReply)
        // Karena buttons sering bikin silent error di beberapa versi Baileys
        const messageOptions = {
            text: menuText,
            mentions: [sender],
        };

        console.log(`[DEBUG] Attempting to send message...`);
        await sock.sendMessage(sender, messageOptions, { quoted: m });
        console.log(`[DEBUG] Menu sent successfully to ${sender}`);

    } catch (err) {
        console.error("[CRITICAL ERROR] Menu Plugin Fail:", err);
        // Fallback paling aman: Teks polosan
        await sock.sendMessage(sender, { text: "Terjadi kesalahan pada sistem menu. Silakan coba lagi nanti." });
    }
};
