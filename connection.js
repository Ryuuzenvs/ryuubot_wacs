const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidDecode
} = require("ourin"); // Tetap pakai ourin
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
    logger: pino({ level: "silent" }), // Tetap silent biar hemat CPU i3 kamu
    printQRInTerminal: !config.usePairingCode, 
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    browser: ["Ubuntu", "Chrome", "20.0.04"], 
  });

  // 2. Logic Pairing Code (Sekarang aman pakai parameter kedua di ourin)
  if (config.usePairingCode && !sock.authState.creds.registered) {
    let phoneNumber = config.pairingNumber;
    if (!phoneNumber) {
      phoneNumber = await question(colors.chalk.cyan("📱 Masukkan nomor WA Bot (contoh: 628123xxx): "));
    }
    phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

    const customDeviceName = config.session?.pairingDeviceName || "ryuu-Bot";

    setTimeout(async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        
        const code = await sock.requestPairingCode(phoneNumber, customDeviceName);
        
        console.log("");
        console.log(
          colors.createBanner(
            [
              "",
              "   PAIRING CODE   ",
              "",
              `   ${colors.chalk.bold(colors.chalk.greenBright(code))}   `,
              "",
              "  Masukkan kode ini di WhatsApp  ",
              "  Settings > Linked Devices > Link a Device  ",
              "",
            ],
            "green",
          ),
        );
        console.log("");
      } catch (error) {
        // Ganti colors.logger dengan console.error biasa jika colors.logger mu tidak ada
        console.error("Gagal request pairing code:", error.message);
      }
    }, 3000);
  }

  // 3. Event: Connection Update (FIXED CRASH)
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      // FIX BARIS 74: Cek apakah lastDisconnect dan error eksis sebelum dibungkus new Boom
      let reason = lastDisconnect?.error 
        ? new Boom(lastDisconnect.error)?.output?.statusCode 
        : DisconnectReason.connectionLost;

      console.log(colors.chalk.red(`Koneksi Terputus: Kode ${reason}`));

      if (reason === DisconnectReason.loggedOut) {
        console.log(colors.chalk.red("Sesi Logout, hapus folder storage/session dan scan ulang."));
        process.exit();
      } else {
        // Beri delay 5 detik sebelum reconnect biar ga spam request ke server WA
        setTimeout(() => connectToWhatsApp(), 5000);
      }
    } else if (connection === "open") {
      console.log(colors.chalk.green("✅ Bot Berhasil Terhubung ke WhatsApp!"));
    }
  });

  // 4. Event: Credentials Update
  sock.ev.on("creds.update", saveCreds);

  // 5. Event: Pesan Masuk
  sock.ev.on("messages.upsert", async (chatUpdate) => {
    try {
      const m = chatUpdate.messages[0];
      if (!m.message) return;
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
