const config = require("../config");

module.exports = async (sock, m, chat) => {
    const { args, sender, senderNumber } = chat;

    const isOwner = senderNumber === config.ownerNumber.replace("@s.whatsapp.net", "");
    if (!isOwner) return;

    let targetId = args[0];
    if (!targetId) return await sock.sendMessage(sender, { text: "⚠️ Masukkan ID Transaksi. Contoh: `.fail TRX123456`" }, { quoted: m });

    const orders = Object.entries(global.active_orders || {});
    const found = orders.find(([buyerJid, ord]) => ord.id === targetId.toUpperCase());

    if (!found) {
        return await sock.sendMessage(sender, { text: `❌ Transaksi *${targetId}* tidak ditemukan di RAM.` }, { quoted: m });
    }

    const [buyerJid, session] = found;
    global.active_orders[buyerJid].status = "CANCEL";

    let failText = `❌ *PEMBAYARAN DITOLAK OLEH OWNER!*\n\n`;
    failText += `• *ID Transaksi:* ${session.id}\n`;
    failText += `• *Produk:* ${session.product_name}\n\n`;
    failText += `_Maaf, bukti transfer Anda dinyatakan tidak valid atau tidak masuk ke mutasi owner._`;

    await sock.sendMessage(buyerJid, { text: failText });

    if (config.chId) {
        const tglString = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
        let chText = `❌ *[PAYMENT REJECTED - CHANNEL MONITOR]*\n\n`;
        chText += `• *ID Transaksi:* ${session.id}\n`;
        chText += `• *Item:* ${session.product_name}\n`;
        chText += `• *Harga:* Rp ${session.nominal.toLocaleString("id-ID")}\n`;
        chText += `• *Tanggal:* ${tglString}\n`;
        chText += `• *Status:* GAGAL / CANCEL (Ditolak Owner)\n`;
        
        const targetChannelJid = config.chId.endsWith("@newsletter") ? config.chId : `${config.chId}@newsletter`;
        await sock.sendMessage(targetChannelJid, { text: chText }).catch(() => {});
    }

    await sock.sendMessage(sender, { text: ` Transaksi *${session.id}* milik @${session.senderNumber} BERHASIL ditolak.` }, { quoted: m });
    delete global.active_orders[buyerJid];
};
