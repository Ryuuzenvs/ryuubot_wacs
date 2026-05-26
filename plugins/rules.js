module.exports = async (sock, m, chat) => {
    const { body, sender, command } = chat;
    const cmds = ["rules", "peraturan"];

    if (cmds.includes(command)) {
        const rulesText = `
*─── [ RULES & KETENTUAN BOT ] ───*

1. *KENDALA & HARGA:*
   - Jika ada kendala, hubungi owner via *.owner*
   - Cek daftar harga produk via *.pricelist*
   - Jika BOT dalam keadaan mati, maka harap bersabar karna owner utama akan mencari cara mengaktifkan bot kembali

2. *LARANGAN KERAS:*
   - Dilarang menelepon/VC bot. Sistem akan otomatis *BLACKLIST* permanen.
   - Dilarang spam command. Jika bot tidak membalas, artinya kamu terkena *.ratelimit*. Tunggu durasi berakhir.

3. *JAM OPERASIONAL:*
   - Open Feedback/Respon Manual: *07.00 - 19.00 WIB*.
   - Di luar jam tersebut, bot tetap aktif namun slow respon jika ada kendala manual.

4. *OWNER & RESELLER:*
   - Semua command *WAJIB* dijalankan di dalam grup OWNER CUST.
   - Jika ketahuan menggunakan fitur khusus di Private Chat (PC), owner berhak melakukan *BLACKLIST*.
   - Bebas di jual belikan asal ADA KONFIRMASI TRX KEPADA OWNER UTAMA dan OWNER UTAMA HARUS SETUJU UNTUK MELAKUKAN CMD ITU.
   - Setinggi tinggi nya value yang dapat di berikan oleh OWNER PENYEWA, HANYA BOLEH SETARA 200% harga sewa penyewa.
   - Melanggar APAPUN RULES DI NO 4 INI, OWNER UTAMA BERHAK ATAS WEWENANG UNTUK MERALAT STATUS OWNER.

5. *SISTEM PANEL, SEWA BOT MENGGUNAKAN E-GUARANTEE CARD (KARTU GARANSI):*
   - Pembelian Panel, sewa bot mendapatkan "Kartu Garansi Digital".
   - Jika Panel, BOT mati/down, klaim perbaikan wajib menyertakan bukti kartu garansi/invoice.
   - Tanpa bukti valid, pergantian panel, produk sewa bot tidak akan diprioritaskan.

6. *KEBIJAKAN PENGGUNA:*
   - Harap baca ketentuan & benefit sebelum membeli. 
   - *No Refund* untuk kesalahan pembelian dari sisi user.
   - Owner berhak memblokir user yang sengaja mencari celah/bug untuk merusak sistem bot.

_Hai Kak @${(chat.sender || "").split("@")[0]}, patuhi rules demi kenyamanan bersama!_
        `;

        await sock.sendMessage(sender, { 
            text: rulesText.trim(),
            mentions: [sender] 
        }, { quoted: m });
    }
};
