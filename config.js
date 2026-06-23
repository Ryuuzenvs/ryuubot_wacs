module.exports = {
//    bot
//    ownerNumber: "6285188510940", // Ganti dengan nomor kamu
    ownerNumber: "6285293726774", // Ganti dengan nomor kamu
    mainBotJID: "6287758378094@s.whatsapp.net",  // JID Bot Utama yang handle QRIS
//    mainBotJID: "6285293726774@s.whatsapp.net",  // JID Bot Utama yang handle QRIS
    ownerGroup: "180243436409031@g.us",         // ID Grup tempat Owner dapet laporan
    pairingNumber: "6287758378094", // Nomor yang mau dijadiin Bot CS    
    chId: "120363427206661375",
//6285188510932
    usePairingCode: true,
    
    // Database Sederhana
    pathPricelist: "./database/allorderkategori.json",
    
    // Pesan-pesan
    msgGreeting: "Halo! Selamat datang di Layanan Order.\nSilakan pilih kategori produk di bawah ini untuk memulai.",
    msgSesiHabis: "⚠️ Sesi pembayaran telah berakhir. Silakan order ulang.",
    
    // Setting i3 Gen 1 (Low Spec Optimization)
    maxMemory: "512mb", // Sekedar pengingat limitasi
    autoClearSession: true,
    responseMode: "private", // Konfigurasi Mode Respon Bot: 'private', 'group', atau 'both'

//    general
    botName: "RYUU BOT CS",
    nameCommercial: "Ryuubot",
    typeApp:"bot whatsapp",
    ownerName: "Ryuu",
    folderAsset: "assets",
    priceRawTxt: "price.txt",
    benefitRawTxt: "benefit.txt",
    rulesRawTxt: "rules.txt",
    roleRawTxt: "role.txt",
    context: "Kamu adalah Ryuu, owner dari Ryuubot. Kamu melayani pelanggan dengan ramah, santai, tapi tetap informatif dan solutif. langsung to the point dan antioot",
replyOot: "Maaf kak, saat ini Ryuu cuma bisa melayani seputar orderan produk digital dan layanan di Ryuubot aja ya. Ada yang bisa dibantu tentang produk kita?",
    cmdMenu: ".menu",
    cmdowner: ".owner",
    cmdOrder: ".produk",
    cmdBuy: ".buy [nomor item]",
    
    

    session: {
        folderName: "session",
        usePairingCode: false,
//        pairingNumber: "6285293726774",
        pairingNumber: "6287758378094",
        printQRInTerminal: true,
        maxReconnectAttempts: 10,
        reconnectInterval: 5000,
        // Tambahkan ini untuk custom nama device pairing
        pairingDeviceName: "RYUUBOTT" 
    },
};
