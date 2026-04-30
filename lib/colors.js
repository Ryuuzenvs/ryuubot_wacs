const chalk = require('chalk');

// Koleksi warna untuk log terminal
const colors = {
    chalk,
    info: (text) => chalk.cyan(text),
    success: (text) => chalk.green(text),
    error: (text) => chalk.red(text),
    warning: (text) => chalk.yellow(text),
    critical: (text) => chalk.black.bgRed(text),
    primary: (text) => chalk.blue(text)
};

module.exports = colors;
