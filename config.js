module.exports = {
    botName: "RYUU BOT CS",
    ownerNumber: "6285188451841", // Ganti dengan nomor kamu
//    ownerNumber: "6285293726774", // Ganti dengan nomor kamu
    mainBotJID: "6285188451841@s.whatsapp.net",  // JID Bot Utama yang handle QRIS
//    mainBotJID: "6285293726774@s.whatsapp.net",  // JID Bot Utama yang handle QRIS
    ownerGroup: "120363407471586477@g.us",         // ID Grup tempat Owner dapet laporan
    
    // Fitur
    usePairingCode: true,
    pairingNumber: "6285188451841", // Nomor yang mau dijadiin Bot CS
//    pairingNumber: "6285293726774", // Nomor yang mau dijadiin Bot CS
    
    // Database Sederhana
    pathPricelist: "./database/allorderkategori.json",
    
    // Pesan-pesan
    msgGreeting: "Halo! Selamat datang di Layanan Order.\nSilakan pilih kategori produk di bawah ini untuk memulai.",
    msgSesiHabis: "⚠️ Sesi pembayaran telah berakhir. Silakan order ulang.",
    
    // Setting i3 Gen 1 (Low Spec Optimization)
    maxMemory: "512mb", // Sekedar pengingat limitasi
    autoClearSession: true,

    session: {
        folderName: "session",
        usePairingCode: true,
        pairingNumber: "6285188451841",
//        pairingNumber: "6285293726774",
        printQRInTerminal: false,
        maxReconnectAttempts: 10,
        reconnectInterval: 5000,
        // Tambahkan ini untuk custom nama device pairing
        pairingDeviceName: "RYUUBOTT" 
    },
};
