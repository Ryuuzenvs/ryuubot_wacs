const fs = require("fs");
const path = require("path");

module.exports = async (sock, m, chat) => {
    const { command, args, sender, prefix } = chat;

    if (command !== "produk") return;

    const dbPath = path.join(process.cwd(), "database", "allorderkategori.json");
    if (!fs.existsSync(dbPath)) {
        return await sock.sendMessage(sender, { text: "_Error: Database produk tidak ditemukan._" }, { quoted: m });
    }
    const dbProduk = JSON.parse(fs.readFileSync(dbPath, "utf-8"));

    // ─── KONDISI A: DAFTAR KATEGORI UTAMA (.item) ───
    if (args.length === 0) {
        let menuText = `*─── 🛒 DAFTAR KATEGORI PRODUK ───*\n\n`;
        menuText += `Halo @${sender.split("@")[0]}, silakan pilih kategori dengan mengetik perintah di bawah ini:\n\n`;

        Object.keys(dbProduk).forEach((kategori) => {
            menuText += `▪️ *${prefix}produk ${kategori}*\n`;
        });

        menuText += `\n───────────────\n`;
        menuText += `_Contoh: ketik *${prefix}produk limit_promo* untuk melihat daftar paket limit._`;

        return await sock.sendMessage(sender, { text: menuText, mentions: [sender] }, { quoted: m });
    }

    // ─── KONDISI B: DETAIL PRODUK DI DALAM KATEGORI (.item [kategori]) ───
    if (args.length > 0) {
        const kategoriTarget = args[0].toLowerCase();

        if (!dbProduk[kategoriTarget]) {
            return await sock.sendMessage(sender, { text: `_Kategori *${kategoriTarget}* tidak ditemukan. Ketik *${prefix}produk* untuk melihat daftar._` }, { quoted: m });
        }

        const listProduk = dbProduk[kategoriTarget];
        let detailText = `*─── 📦 DETAIL KATEGORI: ${kategoriTarget.replace(/_/g, " ").toUpperCase()} ───*\n\n`;
        
        // Logika pencarian nomor urut global berdasarkan index kategori di JSON
        let globalCounter = 1;
        for (const kategori in dbProduk) {
            if (kategori === kategoriTarget) {
                break;
            }
            globalCounter += dbProduk[kategori].length; // Lewati item dari kategori sebelumnya
        }

        listProduk.forEach((item) => {
            detailText += `*${globalCounter}. ${item.name}*\n`;
            detailText += ` ├ Harga: Rp ${item.price.toLocaleString("id-ID")}\n`;
            detailText += ` ├ ID Produk: \`${item.id}\`\n`;
            detailText += ` └ Ketik: *${prefix}buy ${globalCounter}* atau *${prefix}buy ${item.id}*\n\n`;
            globalCounter++;
        });

        detailText += `───────────────\n`;
        detailText += `_Silakan ketik nomor atau ID produk di atas untuk memicu invoice QRIS._`;

        return await sock.sendMessage(sender, { text: detailText }, { quoted: m });
    }
};
