module.exports = async (sock, m, chat) => {
    const { command, sender, isGroup, senderNumber } = chat;

    // Perintah untuk memicu debug secara manual
    if (command === "debug") {
        const waktu = new Date().toLocaleTimeString('id-ID', { hour12: false });
        
        // Ambil data real participant jika di dalam grup
        const realSenderJid = isGroup ? m.key.participant : sender;
        const msgType = Object.keys(m.message || {})[0];

        let debugText = `🛠️ *[RYUUBOT - DEBUGGING NODE]*\n`;
        debugText += `• *Waktu:* ${waktu}\n`;
        debugText += `• *Is Group:* ${isGroup}\n`;
        debugText += `• *chat.sender (Room JID):* ${sender}\n`;
        debugText += `• *chat.senderNumber:* ${senderNumber}\n`;
        debugText += `• *Real Sender JID:* ${realSenderJid}\n`;
        debugText += `• *Message Type:* ${msgType}\n`;
        debugText += `• *Context Info JID:* ${m.key.remoteJid}\n\n`;
        
        debugText += `⚙️ *Struktur m.key:* \n\`\`\`${JSON.stringify(m.key, null, 2)}\`\`\n\n`;
        debugText += `💡 _Gunakan info di atas untuk memastikan target pengiriman pesannya._`;

        // Kirim balik hasil debug ke room tersebut
        await sock.sendMessage(sender, { text: debugText }, { quoted: m }).catch(err => {
            console.error("Gagal mengirim pesan debug lewat WA:", err.message);
            // Jika gagal lewat WA, kita paksa intip via console terminal biar kelihatan
            console.log("\n====== DATA DEBUG TERMINAL ======");
            console.log("Sender Room:", sender);
            console.log("Real Participant:", realSenderJid);
            console.log("m.key:", JSON.stringify(m.key, null, 2));
            console.log("=================================\n");
        });
    }
};
