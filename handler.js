const fs = require("fs");
const path = require("path");
const config = require("./config");

module.exports = async (sock, m) => {
    try {
        if (!m.message) return;
        if (m.key.fromMe) return;

        // Mendapatkan isi pesan (Body)
        const type = Object.keys(m.message)[0];
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                     (type === 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : 
                     (type === 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : '';

        const sender = m.key.remoteJid;
        const isGroup = sender.endsWith('@g.us');

        // Simple Chat Object buat dikirim ke plugin
        const chat = {
            body: body,
            prefix: /^[./!#]/.test(body) ? body[0] : null,
            command: body.slice(1).trim().split(/ +/).shift().toLowerCase(),
            args: body.trim().split(/ +/).slice(1),
            isImage: type === 'imageMessage',
            isGroup: isGroup
        };

        // SCAN & EXECUTE PLUGINS
        const pluginPath = path.join(__dirname, "plugins");
        const pluginFiles = fs.readdirSync(pluginPath).filter(file => file.endsWith(".js"));

        for (const file of pluginFiles) {
            const plugin = require(path.join(pluginPath, file));
            // Panggil fungsi plugin (Export Function Model)
            await plugin(sock, m, chat);
        }

    } catch (err) {
        console.error("Handler Error:", err);
    }
};
