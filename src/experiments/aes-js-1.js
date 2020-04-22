const {Util} = require("../util");
const {encryptedStr1: data, key, iv} = require("./data");


function decryptWithAESJS(data, key, iv) {
    // npm install -D aes-js
    // https://www.npmjs.com/package/aes-js
    const aesjs = require("aes-js");
    const aesCbc = new aesjs.ModeOfOperation.cbc(key, iv);
    return aesCbc.decrypt(data);
}

const decryptedBytes = decryptWithAESJS(data, key, iv);
console.log("Result (ArrayBuffer):");
console.log(decryptedBytes);
console.log("");

const decryptedStr = Util.arrayBufferToUtf8String(decryptedBytes);
console.log("Decrypted with AES-JS:\n");
console.log(decryptedStr);