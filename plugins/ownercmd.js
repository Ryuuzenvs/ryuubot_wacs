const config = require("../config");

module.exports = async (sock, m, chat) => {
    const { command, args, sender, senderNumber } = chat;

    const isOwner = senderNumber === config.ownerNumber.replace("@s.whatsapp.net", "");
    if (!isOwner) return;

    // ==========================================
    // 📋 FITUR: LIST PAYMENT PENDING (.listpay)
    // ==========================================
    if (command === "listpay" || command === "orderlist") {
        const orders = Object.values(global.active_orders || {});
        const pendingOrders = orders.filter(o => o.status === "PENDING");

        if (pendingOrders.length === 0) {
            return await sock.sendMessage(sender, { text: "ℹ️ Tidak ada data pembayaran dengan status *PENDING* saat ini." }, { quoted: m });
        }

        pendingOrders.sort((a, b) => a.timestamp - b.timestamp);

        let listText = `📋 *DAFTAR ANTRIAN PAYMENT (PENDING)*\n`;
        listText += ` Total antrian: ${pendingOrders.length} transaksi\n\n`;

        pendingOrders.forEach((ord, index) => {
            const sisaWaktu = Math.max(0, Math.round((ord.expiry - Date.now()) / 1000 / 60));
            listText += `${index + 1}. *[${ord.id}]* - @${ord.senderNumber}\n`;
            listText += `   • Item: ${ord.product_name}\n`;
            listText += `   • Nominal: Rp ${ord.nominal.toLocaleString("id-ID")}\n`;
            listText += `   • Sisa Sesi: ${sisaWaktu} Menit\n`;
            listText += `   • Run: \`.acc ${ord.id}\` | \`.fail ${ord.id}\`\n`;
            listText += `──────────────────\n`;
        });

        return await sock.sendMessage(sender, { text: listText }, { quoted: m });
    }

    // ==========================================
    //  FITUR: ACC / APPROVE PAYMENT (.acc)
    // ==========================================
    if (command === "acc" || command === "approve") {
        let targetId = args[0];
        if (!targetId) return await sock.sendMessage(sender, { text: "⚠️ Masukkan ID Transaksi. Contoh: `.acc TRX123456`" }, { quoted: m });

        const orders = Object.entries(global.active_orders || {});
        const found = orders.find(([buyerJid, ord]) => ord.id === targetId.toUpperCase());

        if (!found) {
            return await sock.sendMessage(sender, { text: `❌ Transaksi *${targetId}* tidak ditemukan di RAM.` }, { quoted: m });
        }

        const [buyerJid, session] = found;

        global.active_orders[buyerJid].status = "SUCCESS";

        let successText = `✅ *PEMBAYARAN VERIFIED BY OWNER!*\n\n`;
        successText += `• *ID Transaksi:* ${session.id}\n`;
        successText += `• *Produk:* ${session.product_name}\n`;
        successText += `• *Nominal:* Rp ${session.nominal.toLocaleString("id-ID")}\n`;
        successText += `• *Status:* Sukses (Lolos Validasi Owner)\n\n`;
        successText += `_Pesanan Anda berhasil divalidasi. Terima kasih!_`;

        // Kirim notifikasi sukses ke Room asal transaksi dibuat (bisa Japri / Group)
        await sock.sendMessage(buyerJid, { text: successText });
        
        // Kirim update ke Channel WA
        const tglString = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
        let chText = `✅ *[PAYMENT APPROVED - CHANNEL MONITOR]*\n\n`;
        chText += `• *ID Transaksi:* ${session.id}\n`;
        chText += `• *Item:* ${session.product_name}\n`;
        chText += `• *Harga:* Rp ${session.nominal.toLocaleString("id-ID")}\n`;
        chText += `• *Tanggal:* ${tglString}\n`;
        chText += `• *Status:* BERHASIL / SUCCESS\n`;
        
        if (config.chId) {
            const targetChannelJid = config.chId.endsWith("@newsletter") ? config.chId : `${config.chId}@newsletter`;
            await sock.sendMessage(targetChannelJid, { text: chText }).catch(() => {});
        }

        await sock.sendMessage(sender, { text: ` Transaksi *${session.id}* milik @${session.senderNumber} BERHASIL di-ACC.` }, { quoted: m });
        delete global.active_orders[buyerJid];
    }

    // ==========================================
    // ❌ FITUR: FAIL / REJECT PAYMENT (.fail)
    // ==========================================
    if (command === "fail" || command === "reject" || command === "cancel") {
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

        // Kirim update gagal ke Channel WA
        const tglString = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
        let chText = `❌ *[PAYMENT REJECTED - CHANNEL MONITOR]*\n\n`;
        chText += `• *ID Transaksi:* ${session.id}\n`;
        chText += `• *Item:* ${session.product_name}\n`;
        chText += `• *Harga:* Rp ${session.nominal.toLocaleString("id-ID")}\n`;
        chText += `• *Tanggal:* ${tglString}\n`;
        chText += `• *Status:* GAGAL / CANCEL (Ditolak Owner)\n`;
        
        if (config.chId) {
            const targetChannelJid = config.chId.endsWith("@newsletter") ? config.chId : `${config.chId}@newsletter`;
            await sock.sendMessage(targetChannelJid, { text: chText }).catch(() => {});
        }

        await sock.sendMessage(sender, { text: ` Transaksi *${session.id}* milik @${session.senderNumber} BERHASIL ditolak.` }, { quoted: m });
        delete global.active_orders[buyerJid];
    }
};
