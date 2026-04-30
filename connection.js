const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidDecode
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const readline = require("readline");
const config = require("./config");
const handler = require("./handler");
const colors = require("./lib/colors");

// Setup Readline untuk input pairing code di terminal
const question = (text) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(text, (answer) => { rl.close(); resolve(answer); }));
};

async function connectToWhatsApp() {
  // 1. Setup Auth & Folder Session
  const { state, saveCreds } = await useMultiFileAuthState("./storage/session");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }), // 'silent' biar gak menuh-menuhin log di spek low-end
    printQRInTerminal: !config.usePairingCode, // QR muncul kalau usePairingCode = false
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    browser: ["Ubuntu", "Chrome", "20.0.04"], // Identitas bot di WA
  });

  // 2. Logic Pairing Code
  if (config.usePairingCode && !sock.authState.creds.registered) {
    let phoneNumber = config.pairingNumber;
    if (!phoneNumber) {
      phoneNumber = await question(colors.chalk.cyan("📱 Masukkan nomor WA Bot (contoh: 628123xxx): "));
    }
    phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(colors.chalk.black.bgGreen(` KODE PAIRING KAMU : `), colors.chalk.black.bgWhite(` ${code} `));
      } catch (err) {
        console.error("Gagal request pairing code:", err);
      }
    }, 3000);
  }

  // 3. Event: Connection Update
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      console.log(colors.chalk.red(`Koneksi Terputus: ${reason}`));

      if (reason === DisconnectReason.loggedOut) {
        console.log(colors.chalk.red("Sesi Logout, hapus folder session dan scan ulang."));
        process.exit();
      } else {
        // Auto Restart jika terputus bukan karena logout
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log(colors.chalk.green("✅ Bot Berhasil Terhubung ke WhatsApp!"));
    }
  });

  // 4. Event: Credentials Update (Penting agar login tetap tersimpan)
  sock.ev.on("creds.update", saveCreds);

  // 5. Event: Pesan Masuk (Dilempar ke Handler)
  sock.ev.on("messages.upsert", async (chatUpdate) => {
    try {
      const m = chatUpdate.messages[0];
      if (!m.message) return;
      
      // Kirim ke handler.js
      await handler(sock, m);
    } catch (err) {
      console.error("Error Message Upsert:", err);
    }
  });

  // Decode JID Utility
  sock.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {};
      return (decode.user && decode.server && decode.user + "@" + decode.server) || jid;
    } else return jid;
  };

  return sock;
}

module.exports = { connectToWhatsApp };
