const config = require("../config");

module.exports = async (sock, m, chat) => {
    // Ambil sender dan senderNumber dari objek chat
    const { sender, senderNumber, command } = chat;

    // Bersihkan nomor owner dari config (hanya ambil angka saja)
    const cleanConfigOwner = config.ownerNumber.replace(/\D/g, "").trim();
    // Bersihkan nomor pengirim dari chat (hanya ambil angka saja)
    const cleanSenderNumber = senderNumber ? senderNumber.replace(/\D/g, "").trim() : "NOT_FOUND";

    // Cek kecocokan status owner
    const isOwner = cleanSenderNumber === cleanConfigOwner;

    // ─── DEBUGGING CONSOLE ───
    console.log("\n=========== DEBUG LISTPAY (FIXED LID) ===========");
    console.log(`• Command Diterima : .${command}`);
    console.log(`• JID Pengirim      : "${sender}"`);
    console.log(`• Nomor Pengirim    : "${cleanSenderNumber}"`);
    console.log(`• Nomor Owner Config: "${cleanConfigOwner}"`);
    console.log(`• Apakah Cocok      : ${isOwner}`);
    console.log(`• Total Order di RAM: ${Object.keys(global.active_orders || {}).length}`);
    console.log("=================================================\n");

    // Jika tidak cocok, tolak request
    if (!isOwner) {
        return await sock.sendMessage(sender, { 
            text: `🚫 *[DEBUG SECURITY]*\n\nCommand ditolak karena Anda bukan owner.\n• Nomor Anda: *${cleanSenderNumber}*\n• Target Owner: *${cleanConfigOwner}*` 
        }, { quoted: m });
    }

    // ==========================================
    // 📋 SELEKSI DATA PENDING
    // ==========================================
    const orders = Object.values(global.active_orders || {});
    const pendingOrders = orders.filter(o => o.status === "PENDING");

    if (pendingOrders.length === 0) {
        return await sock.sendMessage(sender, { text: "ℹ️ Tidak ada data pembayaran dengan status *PENDING* saat ini di RAM." }, { quoted: m });
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
};
