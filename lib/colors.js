const chalk = require('chalk');

// Koleksi warna untuk log terminal
const colors = {
    chalk,
    info: (text) => chalk.cyan(text),
    success: (text) => chalk.green(text),
    error: (text) => chalk.red(text),
    warning: (text) => chalk.yellow(text),
    critical: (text) => chalk.black.bgRed(text),
    primary: (text) => chalk.blue(text),
    
    // FIX: Tambahkan fungsi pembuat kotak banner pembungkus teks
    createBanner: (lines, colorName = "green") => {
        const borderChalk = chalk[colorName] || chalk.green;
        // Cari baris teks terpanjang untuk menentukan lebar kotak
        const maxLength = Math.max(...lines.map(line => line.length), 30);
        
        const borderTopBottom = borderChalk("+" + "─".repeat(maxLength + 2) + "+");
        const formattedLines = lines.map(line => {
            const padding = " ".repeat(maxLength - line.length);
            return borderChalk("│ ") + chalk.white(line + padding) + borderChalk(" │");
        });
        
        return [borderTopBottom, ...formattedLines, borderTopBottom].join("\n");
    }
};

module.exports = colors;
