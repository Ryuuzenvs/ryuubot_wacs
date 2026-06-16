const config = require("../config");

module.exports = async (sock, m, chat) => {
    const { args, sender, senderNumber } = chat;

    // Proteksi Owner
    const cleanConfigOwner = config.ownerNumber.replace("@s.whatsapp.net", "").trim();
    const cleanSenderNumber = senderNumber ? senderNumber.trim() : "";
    if (cleanSenderNumber !== cleanConfigOwner) return;

    // Gunakan safeReplyJid agar jika owner pakai @lid, bot tetap bisa membalas chat room owner dengan lancar
    const safeReplyJid = sender.endsWith("@lid") && m.key.participantPn ? m.key.participantPn : sender;

    let targetId = args[0];
    if (!targetId) return await sock.sendMessage(safeReplyJid, { text: "⚠️ Masukkan ID Transaksi atau keyword 'all'.\nContoh: `.acc TRX123456` atau `.acc all`" }, { quoted: m });

    const ordersEntries = Object.entries(global.active_orders || {});

    // ==========================================
    // 🔥 LOGIKA BARU: APPROVE SEMUA (.acc all)
    // ==========================================
    if (targetId.toLowerCase() === "all") {
        // Filter hanya yang statusnya PENDING
        const pendingEntries = ordersEntries.filter(([_, ord]) => ord.status === "PENDING");

        if (pendingEntries.length === 0) {
            return await sock.sendMessage(safeReplyJid, { text: "ℹ️ Tidak ada transaksi dengan status *PENDING* untuk di-approve massal." }, { quoted: m });
        }

        let totalBerhasil = 0;
        let channelItemsText = "";

        // Loop dan proses semua transaksi pending secara parallel/sequential
        for (const [buyerJid, session] of pendingEntries) {
            // 1. Ubah status di RAM
            global.active_orders[buyerJid].status = "SUCCESS";

            // 2. Kirim notifikasi sukses ke masing-masing buyer
            let successText = `✅ *PEMBAYARAN VERIFIED BY OWNER (MASSAL)!*\n\n`;
            successText += `• *ID Transaksi:* ${session.id}\n`;
            successText += `• *Produk:* ${session.product_name}\n`;
            successText += `• *Nominal:* Rp ${session.nominal.toLocaleString("id-ID")}\n`;
            successText += `• *Status:* Sukses\n\n`;
            successText += `_Pesanan Anda berhasil divalidasi oleh Owner secara massal. Terima kasih!_`;
            
            await sock.sendMessage(buyerJid, { text: successText }).catch(() => {});

            // 3. Tabung teks detail untuk rekap laporan channel WA nanti
            channelItemsText += `• *${session.id}* | ${session.product_name} | Rp ${session.nominal.toLocaleString("id-ID")}\n`;

            // 4. Hapus sesi dari RAM
            delete global.active_orders[buyerJid];
            totalBerhasil++;
        }

        // 5. Kirim REKAP Massal ke Channel WA (Biar tidak spamming notif channel)
        if (config.chId) {
            const tglString = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
            let chText = `✅ *[MASS PAYMENT APPROVED - CHANNEL MONITOR]*\n\n`;
            chText += `Berhasil memproses *${totalBerhasil}* Transaksi sekaligus:\n`;
            chText += `──────────────────\n`;
            chText += channelItemsText;
            chText += `──────────────────\n`;
            chText += `• *Tanggal:* ${tglString}\n`;
            chText += `• *Status:* ALL SUCCESS / BERHASIL\n`;

            const targetChannelJid = config.chId.endsWith("@newsletter") ? config.chId : `${config.chId}@newsletter`;
            await sock.sendMessage(targetChannelJid, { text: chText }).catch(() => {});
        }

        // 6. Balas ke Owner
        return await sock.sendMessage(safeReplyJid, { text: `⚡ *MASS ACC SUCCESS!*\n\nBerhasil meloloskan *${totalBerhasil}* transaksi pending dari RAM sekaligus.` }, { quoted: m });
    }

    // ==========================================
    // 🎯 LOGIKA LAMA: APPROVE SATU PER SATU
    // ==========================================
    const found = ordersEntries.find(([_, ord]) => ord.id === targetId.toUpperCase());

    if (!found) {
        return await sock.sendMessage(safeReplyJid, { text: `❌ Transaksi *${targetId}* tidak ditemukan di RAM.` }, { quoted: m });
    }

    const [buyerJid, session] = found;
    global.active_orders[buyerJid].status = "SUCCESS";

    let successText = `✅ *PEMBAYARAN VERIFIED BY OWNER!*\n\n`;
    successText += `• *ID Transaksi:* ${session.id}\n`;
    successText += `• *Produk:* ${session.product_name}\n`;
    successText += `• *Nominal:* Rp ${session.nominal.toLocaleString("id-ID")}\n`;
    successText += `• *Status:* Sukses (Lolos Validasi Owner)\n\n`;
    successText += `_Pesanan Anda berhasil divalidasi. Terima kasih!_`;

    await sock.sendMessage(buyerJid, { text: successText });
    
    if (config.chId) {
        const tglString = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
        let chText = `✅ *[PAYMENT APPROVED - CHANNEL MONITOR]*\n\n`;
        chText += `• *ID Transaksi:* ${session.id}\n`;
        chText += `• *Item:* ${session.product_name}\n`;
        chText += `• *Harga:* Rp ${session.nominal.toLocaleString("id-ID")}\n`;
        chText += `• *Tanggal:* ${tglString}\n`;
        chText += `• *Status:* BERHASIL / SUCCESS\n`;
        
        const targetChannelJid = config.chId.endsWith("@newsletter") ? config.chId : `${config.chId}@newsletter`;
        await sock.sendMessage(targetChannelJid, { text: chText }).catch(() => {});
    }

    await sock.sendMessage(safeReplyJid, { text: ` Transaksi *${session.id}* milik @${session.senderNumber} BERHASIL di-ACC.` }, { quoted: m });
    delete global.active_orders[buyerJid];
};
