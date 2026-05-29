const fs = require("fs");
const path = require("path");

module.exports = async (sock, m, chat) => {
    const { command, args, sender, prefix } = chat;

    if (command !== "buy") return;

    const idTarget = args[0];
    if (!idTarget) {
        return await sock.sendMessage(sender, { text: `_Mohon masukkan ID Produk._\n_Contoh: *${prefix}buy lim_1000*_` }, { quoted: m });
    }

    // Ambil database produk
    const dbPath = path.join(process.cwd(), "database", "allorderkategori.json");
    if (!fs.existsSync(dbPath)) {
        return await sock.sendMessage(sender, { text: "_Error: Database produk tidak ditemukan._" }, { quoted: m });
    }
    const dbProduk = JSON.parse(fs.readFileSync(dbPath, "utf-8"));

    // Cari produk berdasarkan ID
    let produkDitemukan = null;
    for (const kategori in dbProduk) {
        const cari = dbProduk[kategori].find(item => item.id === idTarget);
        if (cari) {
            produkDitemukan = cari;
            break;
        }
    }

    if (!produkDitemukan) {
        return await sock.sendMessage(sender, { text: `_ID Produk *${idTarget}* tidak valid._` }, { quoted: m });
    }

    // Cek status orderan user yang masih menggantung
    if (global.active_orders[sender] && global.active_orders[sender].status === "WAIT_PAID") {
        const orderLama = global.active_orders[sender];
        return await sock.sendMessage(sender, { 
            text: `⚠️ Transaksi Anda sebelumnya masih aktif!\n\n*Produk:* ${orderLama.product_name}\n*Nominal:* Rp ${orderLama.nominal.toLocaleString("id-ID")}\n\n_Selesaikan pembayaran tersebut atau tunggu durasi kedaluwarsa habis._` 
        }, { quoted: m });
    }

    // Bikin Sesi Transaksi Baru
    const trxId = "TRX" + Math.floor(100000 + Math.random() * 900000);
    const durasiMenit = 10;
    const waktuSekarang = Date.now();

    global.active_orders[sender] = {
        id: trxId,
        buyer_jid: sender,
        product_id: produkDitemukan.id,
        product_name: produkDitemukan.name,
        nominal: produkDitemukan.price,
        status: "WAIT_PAID",
        timestamp: waktuSekarang,
        expiry: waktuSekarang + (durasiMenit * 60 * 1000)
    };

    // Kirim QRIS Polosan (Tanpa AdReply / Button biar anti-ghosting)
    const pathQRIS = path.resolve("./assets/qris.jpg");
    if (!fs.existsSync(pathQRIS)) {
        return await sock.sendMessage(sender, { text: "_Error: File qris.jpg tidak ditemukan di folder assets._" }, { quoted: m });
    }

    const captionQRIS = `*── 💳 NOTIFIKASI INVOICE PEMBAYARAN ──*\n\n` +
        `• *ID Transaksi:* ${trxId}\n` +
        `• *Produk:* ${produkDitemukan.name}\n` +
        `• *Nominal Transfer:* *Rp ${produkDitemukan.price.toLocaleString("id-ID")}*\n` +
        `• *Status:* Menunggu Pembayaran\n` +
        `• *Sisa Waktu:* ${durasiMenit} Menit\n\n` +
        `Silakan scan kode QR di atas. Masukkan nominal transfer tepat seperti data di atas!\n\n` +
        `⚠️ *WAJIB:* Kirimkan bukti screenshot transfer di chat ini setelah pembayaran sukses agar sistem bisa melakukan validasi otomatis.\n\n` +
        `_S&K: Segala bentuk transaksi tidak dapat dikembalikan jika kesalahan ada di sisi pembeli._`;

    await sock.sendMessage(sender, {
        image: fs.readFileSync(pathQRIS),
        caption: captionQRIS
    }, { quoted: m });

    console.log(`[ORDER] Sesi dibuat untuk ${sender} -> ID: ${trxId}`);

    // Auto-timeout Cleaner Sesi
    setTimeout(async () => {
        if (global.active_orders[sender] && global.active_orders[sender].id === trxId && global.active_orders[sender].status === "WAIT_PAID") {
            delete global.active_orders[sender];
            await sock.sendMessage(sender, { text: `⌛ *Batas waktu transaksi ${trxId} telah habis.* Pesanan otomatis dibatalkan.` });
        }
    }, durasiMenit * 60 * 1000);
};
