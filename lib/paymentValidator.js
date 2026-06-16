const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const colors = require("./colors");
const config = require("../config");

/**
 * Fungsi untuk mengunduh media gambar dari Baileys dengan fitur Auto-Retry
 */
async function downloadMedia(message, filename, maxRetries = 3) {
    const storageDir = path.join(process.cwd(), "storage", "temp");
    if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
    }
    const downloadPath = path.join(storageDir, filename);
    const mediaType = Object.keys(message)[0];

    let attempts = 0;
    while (attempts < maxRetries) {
        try {
            attempts++;
            const stream = await downloadContentFromMessage(message[mediaType], "image", {
                options: { timeout: 20000 }
            });
            
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            
            fs.writeFileSync(downloadPath, buffer);
            return downloadPath;
        } catch (error) {
            console.warn(`[VALIDATOR WARNING] Gagal download media (Percobaan ${attempts}/${maxRetries}): ${error.message}`);
            if (attempts >= maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

/**
 * Eksekutor Validasi Transaksi Bukti Transfer
 */
async function validatePayment(sock, m, chat) {
    const { sender, isGroup, senderNumber } = chat;
    const session = global.active_orders[sender];
    const waktu = colors.chalk.dim(`[${new Date().toLocaleTimeString('id-ID', { hour12: false })}]`);
    const tagValidator = colors.chalk.bold.yellow("[VALIDATOR]");

    console.log(`${waktu} ${tagValidator} Memproses bukti transfer dari: ${sender}`);

    const filename = `${session.id}_proof.jpg`;
    let localImagePath = "";

    try {
        // 1. Download Gambar ke Storage Lokal
        localImagePath = await downloadMedia(m.message, filename);
        console.log(`${waktu} ${tagValidator} Gambar berhasil diunduh ke: ${localImagePath}`);

        // 2. Amankan data sesi di RAM menjadi PENDING
        global.active_orders[sender].status = "PENDING";
        global.active_orders[sender].senderNumber = senderNumber;
        
        // Tentukan JID Buyer yang paling aman (Gunakan Phone Number jika ada @lid)
        const safeBuyerJid = m.key.participantPn || (sender.endsWith('@lid') ? null : sender);
        global.active_orders[sender].buyer_real_jid = safeBuyerJid || sender;

        // 3. KIRIM NOTIFIKASI KE BUYER / ROOM ASAL
        // Menggunakan try-catch lokal agar jika salah satu sendMessage error, status RAM tetap aman berkategori PENDING
        try {
            await sock.sendMessage(sender, { 
                text: `🔍 *[SISTEM VALIDASI]*\n\nBukti transfer untuk transaksi *${session.id}* telah diterima.\nStatus Anda saat ini: *PENDING* (Menunggu Verifikasi Manual oleh Owner).\nMohon ditunggu, proses check mutasi sedang dilakukan.` 
            }, { quoted: m });
        } catch (err) {
            console.error(`${waktu} ${colors.chalk.bold.red("[SEND BUYER ERROR]")} Gagal chat ke buyer room:`, err.message);
        }

        // 4. KIRIM AUTO-STRUK KE CHANNEL WA (ISOLATED)
        if (config.chId) {
            try {
                const tglString = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
                let chText = `📢 *[INCOMING PAYMENT - CHANNEL MONITOR]*\n\n`;
                chText += `• *ID Transaksi:* ${session.id}\n`;
                chText += `• *Item:* ${session.product_name}\n`;
                chText += `• *Harga:* Rp ${session.nominal.toLocaleString("id-ID")}\n`;
                chText += `• *Tanggal:* ${tglString}\n`;
                chText += `• *Status:* PENDING (Menunggu ACC)\n`;

                const targetChannelJid = config.chId.includes("@") ? config.chId : `${config.chId}@newsletter`;
                await sock.sendMessage(targetChannelJid, { text: chText });
            } catch (err) {
                console.error(`${waktu} ${colors.chalk.bold.red("[CHANNEL ERROR]")} Gagal kirim ke channel:`, err.message);
            }
        }

        // 5. KIRIM BUKTI KE GRUP OWNER (ISOLATED & CLEAN JID)
        if (config.ownerGroup) {
            try {
                let ownerGcText = `🔔 *[NOTIFIKASI PEMBAYARAN MASUK]*\n\n`;
                ownerGcText += `• *ID Transaksi:* ${session.id}\n`;
                ownerGcText += `• *Buyer No:* @${senderNumber}\n`; 
                ownerGcText += `• *Produk:* ${session.product_name}\n`;
                ownerGcText += `• *Nominal:* Rp ${session.nominal.toLocaleString("id-ID")}\n\n`;
                ownerGcText += `*Ketik command berikut di grup ini untuk memproses:* \n`;
                ownerGcText += `👉 \`.acc ${session.id}\` (Untuk meloloskan)\n`;
                ownerGcText += `👉 \`.fail ${session.id}\` (Untuk menolak)`;

                // Bersihkan ID group dari karakter spasi atau komparasi string yang merusak JID Baileys
                const cleanGroupJid = config.ownerGroup.trim().includes("@") ? config.ownerGroup.trim() : `${config.ownerGroup.trim()}@g.us`;

                await sock.sendMessage(cleanGroupJid, {
                    image: fs.readFileSync(localImagePath),
                    caption: ownerGcText
                });
                console.log(`${waktu} ${tagValidator} Bukti gambar transaksi berhasil diteruskan ke grup owner.`);
            } catch (err) {
                console.error(`${waktu} ${colors.chalk.bold.red("[OWNER GC ERROR]")} Gagal kirim ke grup owner:`, err.message);
                // Jika error 400 terjadi di sini, tampilkan info penunjuk di terminal
                if (err.message.includes("bad-request") || err.message.includes("400")) {
                    console.log(colors.chalk.yellow(`[TIPS DEBUG] Periksa kembali apakah nilai ownerGroup ("${config.ownerGroup}") di config.js sudah tepat berupa ID Group WhatsApp.`));
                }
            }
        }

    } catch (error) {
        console.error(`${waktu} ${colors.chalk.bold.red("[VALIDATOR CRITICAL ERROR]")}`, error);
    } finally {
        // Hapus file temp gambar biar space disk low-spec i3 kamu aman terjaga
        if (localImagePath && fs.existsSync(localImagePath)) {
            fs.unlinkSync(localImagePath);
            console.log(`${waktu} ${tagValidator} File temp ${filename} berhasil dibersihkan.`);
        }
    }
}

module.exports = { validatePayment };
