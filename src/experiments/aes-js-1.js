import Util from "../util.js";
import {encryptedStr1 as data, key, iv} from "./data.js";


async function decryptWithAESJS(data, key, iv) {
    // npm install -D aes-js
    // https://www.npmjs.com/package/aes-js
    const aesjs = (await import("aes-js")).default;
    const aesCbc = new aesjs.ModeOfOperation.cbc(key, iv);
    return aesCbc.decrypt(data);
}

!async function demo() {
    const decryptedBytes = await decryptWithAESJS(data, key, iv);
    console.log("Result (ArrayBuffer):");
    console.log(decryptedBytes);
    console.log("");

    const decryptedStr = Util.arrayBufferToUtf8String(decryptedBytes);
    console.log("Decrypted with AES-JS:\n");
    console.log(decryptedStr);
}();