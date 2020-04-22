const {Util} = require("../util");
const {encryptedStr1: data, key, iv} = require("./data");


function decryptWithCryptoJS(data, key, iv) {
    const CryptoJS = require("crypto-js");

    const plaintextArray = CryptoJS.AES.decrypt(
        { ciphertext: CryptoJS.enc.Latin1.parse(data) },
        CryptoJS.enc.Hex.parse(key),
        { iv: CryptoJS.enc.Latin1.parse(iv) }
    );

    return CryptoJS.enc.Utf8.stringify(plaintextArray);
}

const keyBase64 = Util.arrayBufferToHexString(key);
const initValue = Util.arrayBufferToBinaryString(iv);
const cryptText = Util.arrayBufferToBinaryString(data);

const decryptedTextWithCryptoJS = decryptWithCryptoJS(cryptText, keyBase64, initValue);

console.log("Decrypted with CryptoJS [1]:\n");
console.log(decryptedTextWithCryptoJS);