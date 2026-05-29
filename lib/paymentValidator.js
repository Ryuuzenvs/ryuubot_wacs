const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const colors = require("./colors");

/**
 * Fungsi untuk mengunduh media gambar dari Baileys
 */
async function downloadMedia(message, filename) {
    const downloadPath = path.join(process.cwd(), "storage", "temp", filename);
    const mediaType = Object.keys(message)[0]; // Biasanya 'imageMessage'
    const stream = await downloadContentFromMessage(message[mediaType], "image");
    
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    
    fs.writeFileSync(downloadPath, buffer);
    return downloadPath;
}

/**
 * Eksekutor Validasi Transaksi Bukti Transfer
 */
async function validatePayment(sock, m, chat) {
    const { sender } = chat;
    const session = global.active_orders[sender];
    const waktu = colors.chalk.dim(`[${new Date().toLocaleTimeString('id-ID', { hour12: false })}]`);
    const tagValidator = colors.chalk.bold.yellow("[VALIDATOR]");

    console.log(`${waktu} ${tagValidator} Memproses bukti transfer dari: ${sender}`);

    // Nama file unik berdasarkan ID Transaksi agar tidak tumpang tindih
    const filename = `${session.id}_proof.jpg`;
    let localImagePath = "";

    try {
        // 1. Download Gambar ke Storage Lokal
        localImagePath = await downloadMedia(m.message, filename);
        console.log(`${waktu} ${tagValidator} Gambar berhasil diunduh ke: ${localImagePath}`);

        // 2. Simulasi Proses OCR / Pembacaan Gambar
        // Bagian ini sengaja kita bypass sementara untuk menguji kestabilan fungsional alur data
        await sock.sendMessage(sender, { 
            text: `🔍 *[SISTEM VALIDASI]*\n\nBukti transfer untuk transaksi *${session.id}* telah diterima.\nSistem sedang menganalisa gambar, mohon tunggu sebentar...` 
        }, { quoted: m });

        // Simulasi delay pembacaan gambar selama 3 detik
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 3. Logika Verifikasi (MOCK VALIDATION)
        // Sementara kita buat 100% otomatis lolos/berhasil untuk keperluan testing
        const isVerified = true; 

        if (isVerified) {
            console.log(`${waktu} ${tagValidator} Transaksi ${session.id} DIBAYAR (Valid)`);
            
            // Ubah status transaksi di RAM
            global.active_orders[sender].status = "SUCCESS";

            let successText = `✅ *PEMBAYARAN BERHASIL PROSES VERIFIKASI!*\n\n`;
            successText += `• *ID Transaksi:* ${session.id}\n`;
            successText += `• *Produk:* ${session.product_name}\n`;
            successText += `• *Nominal:* Rp ${session.nominal.toLocaleString("id-ID")}\n`;
            successText += `• *Status:* Terverifikasi Otomatis\n\n`;
            successText += `_Sesi transaksi diselesaikan. Terima kasih telah melakukan pembelian!_`;

            await sock.sendMessage(sender, { text: successText }, { quoted: m });

            // Hapus sesi transaksi dari RAM karena proses pengujian pembayaran sudah selesai
            delete global.active_orders[sender];

        } else {
            // Skenario jika validasi gagal
            await sock.sendMessage(sender, { 
                text: `❌ *PEMBAYARAN GAGAL DIVERIFIKASI*\n\nData nominal atau nama toko pada struk tidak sesuai. Silakan kirimkan ulang bukti transfer yang lebih jelas.` 
            }, { quoted: m });
        }

    } catch (error) {
        console.error(`${waktu} ${colors.chalk.bold.red("[VALIDATOR ERROR]")} Gagal memproses gambar:`, error);
        await sock.sendMessage(sender, { text: "⚠️ Terjadi kesalahan internal saat memproses dokumen gambar Anda." });
    } finally {
        // Hapus file gambar dari SSD/Harddisk agar spec i3 kamu space-nya tetap lega
        if (localImagePath && fs.existsSync(localImagePath)) {
            fs.unlinkSync(localImagePath);
            console.log(`${waktu} ${tagValidator} File temp ${filename} berhasil dibersihkan.`);
        }
    }
}

module.exports = { validatePayment };
