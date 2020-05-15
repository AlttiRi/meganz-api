// const CryptoJS = require("crypto-js");
// or:

// Note: do not use `@types/crypto-js`, it's terrible. Use `@types/cryptojs`!
const CryptoJS = require("crypto-js/core");
CryptoJS.AES   = require("crypto-js/aes");
CryptoJS.pad.ZeroPadding = require("crypto-js/pad-zeropadding");
CryptoJS.pad.NoPadding   = require("crypto-js/pad-nopadding");

module.exports = {CryptoJS};