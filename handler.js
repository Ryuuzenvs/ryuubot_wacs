const colors = require("./lib/colors");
const config = require("./config");

module.exports = async (sock, m) => {
    const startHandlerTime = performance.now();
    
    try {
        if (!m.message) return;

        const waktu = colors.chalk.dim(`[${new Date().toLocaleTimeString('id-ID', { hour12: false })}]`);
        const tagHandler = colors.chalk.bold.magenta("[HANDLER]");
        const tagDebug = colors.chalk.bold.yellow("[DEBUG-VAR]");

        // ⏱️ CHECKPOINT 1: Parsing Body & Message Type
        const startParsing = performance.now();
        const type = Object.keys(m.message)[0];
        
        if (type === 'protocolMessage' || type === 'senderKeyDistributionMessage') return;

        // Ambil body teks (ditambahkan handling imageMessage dengan caption)
        const msgContent = m.message[type];
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                     (type === 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : 
                     (type === 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : 
                     (type === 'imageMessage') ? m.message.imageMessage.caption : '';

        const prefix = /^[./!#]/.test(body) ? body[0] : null;

        const sender = m.key.remoteJid;
        const isGroup = sender.endsWith('@g.us');

        // =====================================================================
        // 🔍 SPYGLASS DEBUG: Intip isi variabel sebelum ada Guard/Return Clause
        // =====================================================================
        console.log(`\n${waktu} ${tagDebug} 🔍 INSPEKSI DATA MASUK:`);
        console.log(`${waktu} ${tagDebug} ├ 📄 Raw Type Msg : ${colors.chalk.cyan(type)}`);
        console.log(`${waktu} ${tagDebug} ├ 📝 Raw Body Teks: "${colors.chalk.green(body)}"`);
        console.log(`${waktu} ${tagDebug} ├ 🗺️  Prefix Found : ${colors.chalk.yellow(prefix)}`);
        console.log(`${waktu} ${tagDebug} ├ 🙋‍♂️ Is From Me?   : ${colors.chalk.red(m.key.fromMe)}`);
        console.log(`${waktu} ${tagDebug} ├ 👥 Is Group?     : ${colors.chalk.blue(isGroup)}`);
        console.log(`${waktu} ${tagDebug} └ 🆔 Remote JID   : ${colors.chalk.magenta(sender)}`);
        // =====================================================================

        // Jebakan batmen pertama yang berpotensi bikin mampet total
        if (m.key.fromMe && !prefix) {
            console.log(`${waktu} ${tagDebug} 🛑 TRIGGERED: m.key.fromMe && !prefix -> Chat dari bot sendiri tanpa prefix diabaikan.`);
            return;
        }

        const trimmedBody = body.trim();
        const command = prefix ? trimmedBody.slice(1).trim().split(/ +/).shift().toLowerCase() : '';
        const args = trimmedBody.split(/ +/).slice(1);
        const endParsing = performance.now();

        // 🛠️ LOGIK AMBIL NOMOR & NAMA GRUP (FIXED FOR @LID PRIVACY ACCOUNT)
        let realSenderJid = isGroup ? (m.key.participantPn || m.key.participant || sender) : sender;
        if (isGroup && m.key.participantPn) {
            realSenderJid = m.key.participantPn;
        } else if (!isGroup && sender.endsWith('@lid')) {
            realSenderJid = m.key.participantPn || sender;
        }
        const senderNumber = realSenderJid ? realSenderJid.split('@')[0] : 'Unknown';
        
        let chatTypeInfo = "";
        if (isGroup) {
            const groupMetadata = sock.chats?.[sender] || await sock.groupMetadata?.(sender).catch(() => null);
            const groupName = groupMetadata?.subject || "Nama Grup Tidak Diketahui";
            chatTypeInfo = `${colors.chalk.bold.green("[GROUP]")} -> ${colors.chalk.cyan(groupName)}`;
        } else {
            chatTypeInfo = `${colors.chalk.bold.blue("[PRIVATE]")}`;
        }

        if (m.key.fromMe) {
            console.log(`${waktu} ${tagHandler} ┌ 📬 ${colors.chalk.yellow("Bot Response:")} ${colors.chalk.italic(body || '[Media/Button]')}`);
        } else {
            console.log(`${waktu} ${tagHandler} ┌ 📩 ${colors.chalk.cyan("Pesan Masuk:")} ${body}`);
        }
        console.log(`${waktu} ${tagHandler} ├ 👤 Sender: ${colors.chalk.magenta(senderNumber)} ${chatTypeInfo}`);

        // Gunakan realSenderJid yang sudah diproses di atas agar bebas dari jebakan akun @lid
        const chat = { sender: realSenderJid, body, prefix, command, args, isImage: type === 'imageMessage', isGroup, senderNumber };
        console.log(`${waktu} ${tagHandler} ├ ⏱️  [CP 1] Parsing & Regex: ${colors.chalk.yellow((endParsing - startParsing).toFixed(3) + ' ms')}`);

        // =====================================================================
        // 🛑 CONDITIONAL LOGIC: CEK MODE RESPON WITH LOGGER & BYPASS COMMANDS (FIXED)
        // =====================================================================
        const mode = config.responseMode || 'both';
        console.log(`${waktu} ${tagDebug} ⚙️  Config Mode Target: [${colors.chalk.bold.green(mode.toUpperCase())}] | Status Chat: [${colors.chalk.bold.cyan(chat.isGroup ? 'GROUP' : 'PRIVATE')}]`);

        // Daftar command yang diizinkan lewat meskipun bot dalam mode private di grup
        const whitelistCommands = ['listpay', 'acc', 'fail'];

        if (!m.key.fromMe) { 
            // Cek apakah chat saat ini merupakan salah satu dari command whitelist
            const isWhitelisted = whitelistCommands.includes(chat.command);

            if (mode === 'private' && chat.isGroup) {
                // JIKA MODE PRIVATE: Di grup hanya boleh menerima command yang ada di whitelist
                if (!prefix || !isWhitelisted) {
                    console.log(`${waktu} ${tagHandler} └ 🛑 Skip Action: Mode Bot [PRIVATE]. Chat biasa / command non-whitelist di grup diabaikan.`);
                    return; 
                }
            }
            
            if (mode === 'group' && !chat.isGroup) {
                console.log(`${waktu} ${tagHandler} └ 🛑 Skip Action: Mode Bot [GROUP]. Chat pribadi diabaikan secara sengaja.`);
                return; 
            }
        }
        // =====================================================================

        // Safe Guard check biar tidak crash kalau global.active_orders undefined
        if (!global.active_orders) global.active_orders = {};

        // =====================================================================
        // 🔥 INTERSEPTOR BUKTI TRANSFER PEMBAYARAN (MILESTONE 3)
        // =====================================================================
        if (global.active_orders[sender] && global.active_orders[sender].status === "WAIT_PAID" && chat.isImage) {
            console.log(`${waktu} ${tagHandler} ├ 💳 Mendeteksi kiriman citra dari user dalam sesi WAIT_PAID.`);
            const { validatePayment } = require("./lib/paymentValidator");
            console.log(`${waktu} ${tagHandler} ├ 🚀 Running External Utility: paymentValidator.js`);
            const startValidator = performance.now();
            
            await validatePayment(sock, m, chat);
            
            const endValidator = performance.now();
            console.log(`${waktu} ${tagHandler} └ ✔️  Selesai diproses via Validator. Total: ${colors.chalk.green((endValidator - startHandlerTime).toFixed(3) + ' ms')}`);
            return; 
        }

        // ⏱️ CHECKPOINT 2: Eksekusi File Plugin
        if (prefix && command) {
            const targetPluginFile = `${command}.js`;
            const plugin = global.plugins[targetPluginFile];

            if (typeof plugin === "function") {
                console.log(`${waktu} ${tagHandler} ├ 🚀 Running Plugin: ${colors.chalk.green(targetPluginFile)}`);
                const startPlugin = performance.now();
                
                await plugin(sock, m, chat);
                
                const endPlugin = performance.now();
                console.log(`${waktu} ${tagHandler} ├ ⏱️  [CP 2] Internal Plugin Logic: ${colors.chalk.red((endPlugin - startPlugin).toFixed(3) + ' ms')}`);
            } else {
                console.log(`${waktu} ${tagHandler} ├ ⚠️  Command ${colors.chalk.yellow('.' + command)} tidak terdaftar.`);
            }
        } else {
            // 🧠 ROUTING TO SMART AI FALLBACK (TANPA PREFIX)
            // Blok ini sekarang aman karena chat grup tanpa prefix sudah diblokir di atas dalam mode private
            console.log(`${waktu} ${tagHandler} ├ 💬 Chat biasa tanpa prefix, mengarahkan ke AI Handler...`);
            const aiHandler = require("./lib/aiHandler");
            await aiHandler(sock, m, chat);
        }

        const totalHandlerTime = performance.now() - startHandlerTime;
        console.log(`${waktu} ${tagHandler} └ ✔️  Selesai diproses. Total: ${colors.chalk.green(totalHandlerTime.toFixed(3) + ' ms')}`);

    } catch (err) {
        const waktu = colors.chalk.dim(`[${new Date().toLocaleTimeString('id-ID', { hour12: false })}]`);
        const tagHandler = colors.chalk.bold.red("[HANDLER ERROR]");
        console.error(`${waktu} ${tagHandler} └ ❌ Gagal memproses total di try-catch:`, err);
    }
};
