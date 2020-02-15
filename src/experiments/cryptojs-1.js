const { util } = require("../util");
const { encryptedStr1: data, key, iv } = require("./data");


function decryptWithCryptoJS(data, key, iv) {
    const CryptoJS = require("crypto-js");

    const plaintextArray = CryptoJS.AES.decrypt(
        { ciphertext: CryptoJS.enc.Latin1.parse(data) },
        CryptoJS.enc.Hex.parse(key),
        { iv: CryptoJS.enc.Latin1.parse(iv) }
    );

    return CryptoJS.enc.Utf8.stringify(plaintextArray);
}

const keyBase64 = util.arrayBufferToHexString(key);
const initValue = util.arrayBufferToBinaryString(iv);
const cryptText = util.arrayBufferToBinaryString(data);

const decryptedTextWithCryptoJS = decryptWithCryptoJS(cryptText, keyBase64, initValue);

console.log("Decrypted with CryptoJS [1]:\n");
console.log(decryptedTextWithCryptoJS);