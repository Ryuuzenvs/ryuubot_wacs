const fs = require("fs");
const path = require("path");

module.exports = async (sock, m, chat) => {
    const { command, args, sender, prefix } = chat;

    if (command !== "order") return;

    const dbPath = path.join(process.cwd(), "database", "allorderkategori.json");
    if (!fs.existsSync(dbPath)) {
        return await sock.sendMessage(sender, { text: "_Error: Database produk tidak ditemukan._" }, { quoted: m });
    }
    const dbProduk = JSON.parse(fs.readFileSync(dbPath, "utf-8"));

    // TAMPILKAN DAFTAR KATEGORI UTAMA (.order)
    if (args.length === 0) {
        let menuText = `*─── 🛒 DAFTAR KATEGORI PRODUK ───*\n\n`;
        menuText += `Halo @${sender.split("@")[0]}, silakan pilih kategori dengan mengetik perintah di bawah ini:\n\n`;

        Object.keys(dbProduk).forEach((kategori) => {
            menuText += `▪️ *${prefix}order ${kategori}*\n`;
        });

        menuText += `\n───────────────\n`;
        menuText += `_Contoh: ketik *${prefix}order limit_promo* untuk melihat daftar paket limit._`;

        return await sock.sendMessage(sender, { text: menuText, mentions: [sender] }, { quoted: m });
    }

    // TAMPILKAN DETAIL PRODUK DI DALAM KATEGORI (.order [kategori])
    if (args.length > 0) {
        const kategoriTarget = args[0].toLowerCase();

        if (!dbProduk[kategoriTarget]) {
            return await sock.sendMessage(sender, { text: `_Kategori *${kategoriTarget}* tidak ditemukan. Ketik *${prefix}order* untuk melihat daftar._` }, { quoted: m });
        }

        const listProduk = dbProduk[kategoriTarget];
        let detailText = `*─── 📦 DETAIL KATEGORI: ${kategoriTarget.replace(/_/g, " ").toUpperCase()} ───*\n\n`;
        
        listProduk.forEach((item) => {
            detailText += `📌 *${item.name}*\n`;
            detailText += ` ├ Harga: Rp ${item.price.toLocaleString("id-ID")}\n`;
            detailText += ` └ Ketik untuk Beli: *${prefix}buy ${item.id}*\n\n`;
        });

        detailText += `───────────────\n`;
        detailText += `_Silakan ketik atau salin teks perintah *${prefix}buy [id_produk]* di atas untuk memicu invoice QRIS._`;

        return await sock.sendMessage(sender, { text: detailText }, { quoted: m });
    }
};
