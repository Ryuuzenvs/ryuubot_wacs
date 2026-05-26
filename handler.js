const fs = require("fs");
const path = require("path");
const config = require("./config");

module.exports = async (sock, m) => {
    try {
        if (!m.message) return;

        // Mendapatkan isi pesan (Body)
        const type = Object.keys(m.message)[0];
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                     (type === 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : 
                     (type === 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : '';

        const prefix = /^[./!#]/.test(body) ? body[0] : null;

        // FIX: Jika pesan dari diri sendiri (fromMe) TAPI tidak pakai prefix command, kita abaikan.
        // Ini mencegah bot merespon chat ketikan biasa dari diri sendiri / mencegah looping response.
        if (m.key.fromMe && !prefix) return;

        // Tambah Variable Waktu Jam:Menit:Detik
        const waktu = new Date().toLocaleTimeString('id-ID', { hour12: false });
        console.log(`[${waktu}] [HANDLER] Ada pesan masuk: ${body}`); 

        const sender = m.key.remoteJid;
        const isGroup = sender.endsWith('@g.us');

        // Simple Chat Object buat dikirim ke plugin
        const chat = {
            sender: sender, 
            body: body,
            prefix: prefix,
            command: body.slice(1).trim().split(/ +/).shift().toLowerCase(),
            args: body.trim().split(/ +/).slice(1),
            isImage: type === 'imageMessage',
            isGroup: isGroup
        };

        // SCAN & EXECUTE PLUGINS
        const pluginPath = path.join(__dirname, "plugins");
        const pluginFiles = fs.readdirSync(pluginPath).filter(file => file.endsWith(".js"));
        console.log(`[${waktu}] [HANDLER] Menemukan ${pluginFiles.length} plugin: ${pluginFiles.join(', ')}`);

        for (const file of pluginFiles) {
            const plugin = require(path.join(pluginPath, file));
            // Panggil fungsi plugin (Export Function Model)
            await plugin(sock, m, chat);
        }

    } catch (err) {
        console.error("Handler Error:", err);
    }
};
