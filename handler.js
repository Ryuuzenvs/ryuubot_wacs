const colors = require("./lib/colors");

module.exports = async (sock, m) => {
    // Mulai hitung total waktu pemrosesan handler
    const startHandlerTime = performance.now();
    
    try {
        if (!m.message) return;

        const waktu = colors.chalk.dim(`[${new Date().toLocaleTimeString('id-ID', { hour12: false })}]`);
        const tagHandler = colors.chalk.bold.magenta("[HANDLER]");

        // ⏱️ CHECKPOINT 1: Parsing Body & Message Type
        const startParsing = performance.now();
        const type = Object.keys(m.message)[0];
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                     (type === 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : 
                     (type === 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : '';

        const prefix = /^[./!#]/.test(body) ? body[0] : null;

        if (m.key.fromMe && !prefix) return;

        const trimmedBody = body.trim();
        const command = prefix ? trimmedBody.slice(1).trim().split(/ +/).shift().toLowerCase() : '';
        const args = trimmedBody.split(/ +/).slice(1);
        const endParsing = performance.now();
        // ------------------------------------------

        const sender = m.key.remoteJid;
        const isGroup = sender.endsWith('@g.us');
        
        // 🛠️ LOGIK AMBIL NOMOR & NAMA GRUP
        // Ambil nomor pengirim asli (jika grup, ambil dari m.key.participant, jika pribadi dari sender)
        const realSenderJid = isGroup ? m.key.participant : sender;
        const senderNumber = realSenderJid ? realSenderJid.split('@')[0] : 'Unknown';
        
        let chatTypeInfo = "";
        if (isGroup) {
            // Ambil nama grup dari cache sock.chats jika tersedia
            const groupMetadata = sock.chats?.[sender] || await sock.groupMetadata?.(sender).catch(() => null);
            const groupName = groupMetadata?.subject || "Nama Grup Tidak Diketahui";
            chatTypeInfo = `${colors.chalk.bold.green("[GROUP]")} -> ${colors.chalk.cyan(groupName)}`;
        } else {
            chatTypeInfo = `${colors.chalk.bold.blue("[PRIVATE]")}`;
        }
        // ------------------------------------------

        // Cetak Log Header Pesan Masuk / Keluar
        if (m.key.fromMe) {
            console.log(`\n${waktu} ${tagHandler} ┌ 📬 ${colors.chalk.yellow("Bot Response:")} ${colors.chalk.italic(body || '[Media/Button]')}`);
        } else {
            console.log(`\n${waktu} ${tagHandler} ┌ 📩 ${colors.chalk.cyan("Pesan Masuk:")} ${body}`);
        }
        
        // Cetak Log Info Pengirim (Fitur Baru)
        console.log(`${waktu} ${tagHandler} ├ 👤 Sender: ${colors.chalk.magenta(senderNumber)} ${chatTypeInfo}`);

        const chat = { sender, body, prefix, command, args, isImage: type === 'imageMessage', isGroup, senderNumber };

        // Tampilkan hasil parsing data awal
        console.log(`${waktu} ${tagHandler} ├ ⏱️  [CP 1] Parsing & Regex: ${colors.chalk.yellow((endParsing - startParsing).toFixed(3) + ' ms')}`);

        // =====================================================================
        // 🔥 INTERSEPTOR BUKTI TRANSFER PEMBAYARAN (MILESTONE 3)
        // =====================================================================
        if (global.active_orders[sender] && global.active_orders[sender].status === "WAIT_PAID" && chat.isImage) {
            console.log(`${waktu} ${tagHandler} ├ 💳 Mendeteksi kiriman citra dari user dalam sesi WAIT_PAID.`);
            
            const { validatePayment } = require("./lib/paymentValidator");
            
            console.log(`${waktu} ${tagHandler} ├ 🚀 Running External Utility: paymentValidator.js`);
            const startValidator = performance.now();
            
            // Eksekusi fungsi eksternal utilitas
            await validatePayment(sock, m, chat);
            
            const endValidator = performance.now();
            console.log(`${waktu} ${tagHandler} └ ✔️  Selesai diproses via Validator. Total: ${colors.chalk.green((endValidator - startHandlerTime).toFixed(3) + ' ms')}`);
            return; // STOP FLOW DISINI agar tidak lanjut mencari command plugin biasa!
        }
        // =====================================================================

        // ⏱️ CHECKPOINT 2: Eksekusi File Plugin
        if (prefix && command) {
            const targetPluginFile = `${command}.js`;
            const plugin = global.plugins[targetPluginFile];

            if (typeof plugin === "function") {
                console.log(`${waktu} ${tagHandler} ├ 🚀 Running Plugin: ${colors.chalk.green(targetPluginFile)}`);
                
                const startPlugin = performance.now();
                
                // Eksekusi fungsi internal plugin kamu
                await plugin(sock, m, chat);
                
                const endPlugin = performance.now();
                console.log(`${waktu} ${tagHandler} ├ ⏱️  [CP 2] Internal Plugin Logic: ${colors.chalk.red((endPlugin - startPlugin).toFixed(3) + ' ms')}`);
            } else {
                console.log(`${waktu} ${tagHandler} ├ ⚠️  Command ${colors.chalk.yellow('.' + command)} tidak terdaftar.`);
            }
        } else {
            console.log(`${waktu} ${tagHandler} ├ 💬 Chat biasa, mengabaikan plugin.`);
        }

        // ⏱️ CHECKPOINT 3: Total End-to-End Execution
        const totalHandlerTime = performance.now() - startHandlerTime;
        console.log(`${waktu} ${tagHandler} └ ✔️  Selesai diproses. Total: ${colors.chalk.green(totalHandlerTime.toFixed(3) + ' ms')}`);

    } catch (err) {
        const waktu = colors.chalk.dim(`[${new Date().toLocaleTimeString('id-ID', { hour12: false })}]`);
        const tagHandler = colors.chalk.bold.red("[HANDLER ERROR]");
        console.error(`${waktu} ${tagHandler} └ ❌ Gagal memproses:`, err);
    }
};
