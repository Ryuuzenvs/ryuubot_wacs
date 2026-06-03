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

const question = (text) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(text, (answer) => { rl.close(); resolve(answer); }));
};

async function connectToWhatsApp() {
  console.log(colors.chalk.blue("[DEBUG 1] Membaca state session dari storage..."));
  const { state, saveCreds } = await useMultiFileAuthState("./storage/session");
  const { version } = await fetchLatestBaileysVersion();
  
  console.log(colors.chalk.blue(`[DEBUG 2] Baileys Version: ${version.join(".")}`));
  console.log(colors.chalk.blue(`[DEBUG 3] Apakah nomor sudah terdaftar di session lokal?: ${state.creds?.registered}`));

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }), 
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    // Sesuai dokumentasi Baileys terbaru untuk pairing code kustom device name
    browser: ["Ubuntu", "Chrome", "20.0.04"], 
    markOnline: true,
    syncFullHistory: false
  });

  // Flag untuk mengunci agar request pairing code tidak dijalankan berulang-ulang
  let isPairingRequested = false;

  // 3. Event: Connection Update
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    // Log setiap perubahan status koneksi untuk melihat handshake WA
    console.log(colors.chalk.dim(`[DEBUG connection.update] Status: ${connection} | QR Available: ${!!qr}`));

    if (connection === "close") {
      let reason = lastDisconnect?.error 
        ? new Boom(lastDisconnect.error)?.output?.statusCode 
        : DisconnectReason.connectionLost;

      console.log(colors.chalk.red(`Koneksi Terputus: Kode ${reason}`));

      if (reason === DisconnectReason.loggedOut) {
        console.log(colors.chalk.red("Sesi Logout, menghapus folder session..."));
        if (fs.existsSync("./storage/session")) {
          fs.rmSync("./storage/session", { recursive: true, force: true });
        }
        process.exit();
      } else if (reason === DisconnectReason.restartRequired || reason === 411) {
        console.log(colors.chalk.yellow("Sesi mengalami kendala sinkronisasi. Memulai ulang koneksi..."));
        setTimeout(() => connectToWhatsApp(), 3000);
      } else {
        setTimeout(() => connectToWhatsApp(), 5000);
      }
    } 
    
    else if (connection === "open") {
      console.log(colors.chalk.green("✅ Bot Berhasil Terhubung ke WhatsApp!"));
    }

    // 🔥 TRICK UTAMA: Request pairing saat Baileys mengeluarkan sinyal QR awal / stanby koneksi
    if (config.usePairingCode && !sock.authState.creds.registered && !isPairingRequested) {
      isPairingRequested = true; // Kunci biar ga spamming loop
      
      console.log(colors.chalk.yellow("\n[DEBUG 4] Trigger pairing code aktif via connection.update stanby..."));
      
      let phoneNumber = config.pairingNumber;
      if (!phoneNumber) {
        phoneNumber = await question(colors.chalk.cyan("📱 Masukkan nomor WA Bot (contoh: 628123xxx): "));
      }
      phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

      const customDeviceName = config.session?.pairingDeviceName || "RYUUBOTT";
      
      // Berikan jeda 4 detik setelah event stanby agar internal state Baileys benar-benar settle
      setTimeout(async () => {
        try {
          console.log(colors.chalk.yellow(`[DEBUG 5] Mengirimkan parameter request ke WA Server...`));
          console.log(colors.chalk.dim(`[DEBUG] Target Phone: ${phoneNumber} | Device Name: ${customDeviceName}`));
          
          let code;
          try {
            // Test request dengan custom device name sesuai config kamu
            code = await sock.requestPairingCode(phoneNumber, customDeviceName);
            console.log(colors.chalk.green("[DEBUG 6a] Request kustom nama sukses."));
          } catch (err) {
            console.log(colors.chalk.red(`[DEBUG 6b] Nama kustom ditolak/error: ${err.message}. Mencoba fallback standard...`));
            // Jeda 2 detik sebelum hit ulang polosan agar tidak terkena rate limit spam dari server WA
            await new Promise((resolve) => setTimeout(resolve, 2000));
            code = await sock.requestPairingCode(phoneNumber);
          }
          
          console.log(colors.chalk.blue(`[DEBUG 7] Hasil dari Server WhatsApp (Code): ${code}`));

          if (!code) {
            throw new Error("Menerima response kosong/undefined dari server WhatsApp.");
          }

          console.log("");
          console.log(
            colors.createBanner(
              [
                "",
                "    PAIRING CODE   ",
                "",
                `    ${colors.chalk.bold(colors.chalk.greenBright(code))}   `,
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
          console.error(colors.chalk.red("\n[FATAL ERROR] Gagal total request pairing code:"), error.message);
          console.log(colors.chalk.dim(error.stack));
          // Jika gagal total, buka kunci agar bisa coba lagi saat restart berkala
          isPairingRequested = false; 
        }
      }, 4000);
    }
  });

  // 4. Event: Credentials Update
  sock.ev.on("creds.update", () => {
    // Log ini berguna untuk memantau apakah Baileys berhasil menyimpan session baru ke folder storage
    console.log(colors.chalk.magenta("[DEBUG creds.update] Menulis data kredensial baru ke storage..."));
    saveCreds();
  });

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
