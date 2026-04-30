const { connectToWhatsApp } = require("./connection.js");
const colors = require("./lib/colors"); // Pastikan file colors kamu ada di folder lib

console.log(colors.chalk.blue("\n--- RYUU BOT CS SYSTEM STARTING ---"));

async function startBot() {
    try {
        await connectToWhatsApp();
    } catch (error) {
        console.error("Critical Error on Start:", error);
    }
}

// Mencegah bot mati saat ada error gak terduga (PENTING buat spek low-end)
process.on("uncaughtException", (err) => {
    console.error("Caught exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

startBot();
