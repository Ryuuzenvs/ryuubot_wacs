module.exports = {
    botName: "RYUU BOT CS",
    ownerNumber: "6285809839062", // Ganti dengan nomor kamu
    mainBotJID: "84878311691@s.whatsapp.net",  // JID Bot Utama yang handle QRIS
    ownerGroup: "120363407471586477@g.us",         // ID Grup tempat Owner dapet laporan
    
    // Fitur
    usePairingCode: true,
    pairingNumber: "84878311691", // Nomor yang mau dijadiin Bot CS
    
    // Database Sederhana
    pathPricelist: "./database/allorderkategori.json",
    
    // Pesan-pesan
    msgGreeting: "Halo! Selamat datang di Layanan Order.\nSilakan pilih kategori produk di bawah ini untuk memulai.",
    msgSesiHabis: "⚠️ Sesi pembayaran telah berakhir. Silakan order ulang.",
    
    // Setting i3 Gen 1 (Low Spec Optimization)
    maxMemory: "512mb", // Sekedar pengingat limitasi
    autoClearSession: true
};
