import Util from "../util.js";

import CryptoJS from "crypto-js";


function decryptWithCryptoJS(data, key, iv) {
    const plaintextArray = CryptoJS.AES.decrypt(
        { ciphertext: CryptoJS.enc.Hex.parse(data) },
        CryptoJS.enc.Hex.parse(key),
        { iv: CryptoJS.enc.Hex.parse(iv) }
    );

    return CryptoJS.enc.Latin1.stringify(plaintextArray);
}

/** Hex encoded */

const cryptText = "2bb7a12a7e59f9fa3c3d4ff0eb502cde3187338cc3137af785995b364fc5b3fe9c208f225c7472bb3de55de18a665863f63030d652b870c4610a70bc771e8bc584df7c3bd2ce3fc1940115e556178e740891f7cac450204a4959916ac9c9cd5aedd92cc7e74a7a581a6d47a6c29fb46eee13ffd3f70616844f8e2bb929c60ad9";
const keyBase64 = "8af4d72873e4016cd73a1d5b851e9cb2";
const initValue = "47b79d24e3ec47c528abdaed8f3fafde";

const decryptedTextWithCryptoJS = decryptWithCryptoJS(cryptText, keyBase64, initValue);

console.log("Decrypted with CryptoJS [3]:\n");
console.log(decryptedTextWithCryptoJS);

console.log("\nResult (base64):");
console.log(Util.binaryStringToBase64(decryptedTextWithCryptoJS));
