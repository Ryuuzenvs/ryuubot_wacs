const fs = require("fs");
const path = require("path");
// FIX: Ambil modul utuh, lalu kita seleksi foldernya di bawah
const connectionModule = require("./connection.js"); 
const colors = require("./lib/colors");

console.log(colors.chalk.blue("\n--- RYUU BOT CS SYSTEM STARTING ---"));

// Inisialisasi object global untuk menampung plugin di RAM
global.plugins = {};
global.active_orders = {};

function loadPlugins() {
    const waktu = colors.chalk.dim(`[${new Date().toLocaleTimeString('id-ID', { hour12: false })}]`);
    try {
        const pluginPath = path.join(__dirname, "plugins");
        
        if (!fs.existsSync(pluginPath)) fs.mkdirSync(pluginPath);
        const pluginFiles = fs.readdirSync(pluginPath).filter(file => file.endsWith(".js"));
        
        for (const file of pluginFiles) {
            const actualPath = path.join(pluginPath, file);
            delete require.cache[require.resolve(actualPath)];
            global.plugins[file] = require(actualPath);
        }
        
        console.log(`${waktu} ${colors.chalk.bold.green("[SYSTEM]")} Berhasil load ${pluginFiles.length} plugin ke RAM.`);
    } catch (error) {
        console.error(`${waktu} ${colors.chalk.bold.red("[SYSTEM ERROR]")} Gagal load plugins:`, error);
    }
}

async function startBot() {
    try {
        // Load semua file plugin ke RAM dulu
        loadPlugins();
        
        // FIX: Cek apakah yang diexport itu bentuk fungsi langsung atau di dalam objek
        const connect = typeof connectionModule === "function" 
            ? connectionModule 
            : connectionModule.connectToWhatsApp;

        if (typeof connect !== "function") {
            throw new TypeError("Fungsi koneksi WhatsApp tidak ditemukan di connection.js!");
        }

        // Jalankan fungsi koneksinya
        await connect();
    } catch (error) {
        console.error("Critical Error on Start:", error);
    }
}

// Global Error Catching
process.on("uncaughtException", (err) => {
    console.error("Caught exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

startBot();
