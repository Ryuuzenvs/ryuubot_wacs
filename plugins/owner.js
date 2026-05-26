const config = require("../config");

module.exports = async (sock, m, chat) => {
    const { sender, command } = chat;
    
    if (command === "owner") {
        const ownerNomor = config.ownerNumber.split('@')[0];
        
        const vcard = `BEGIN:VCARD
VERSION:3.0
N:Owner;Ryuu;;;
FN:Owner Ryuu
TEL;waid=${ownerNomor}:${ownerNomor}
END:VCARD`;

        const chatId = await sock.sendMessage(sender, {
            contacts: {
                displayName: "Owner Bot",
                contacts: [{ vcard }]
            }
        }, { quoted: m });

        await sock.sendMessage(sender, {
            text: `Hai @${sender.split("@")[0]}, itu kontak Owner saya.`,
            mentions: [sender]
        }, { quoted: chatId });
    }
};
