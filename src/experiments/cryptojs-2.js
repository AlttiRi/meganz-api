const {Util} = require("../util");
const {encryptedStr1: data, key, iv} = require("./data");



function decryptWithCryptoJS(data, key, iv = new Uint8Array(key.length)){
    const CryptoJS = require("crypto-js");

    key  = Util.arrayBufferToBinaryString(key);
    iv   = Util.arrayBufferToBinaryString(iv);
    data = Util.arrayBufferToBinaryString(data);

    /** @see CryptoJS.enc.Latin1.stringify code */
    function _wordArrayToArrayBuffer(wordArray) {
        let bites = [];
        for (let i = 0; i < wordArray.sigBytes; i++) {
            const bite = (wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
            bites.push(bite);
        }
        return new Uint8Array(bites);
    }

    const plaintextArray = CryptoJS.AES.decrypt(
        {
            ciphertext: CryptoJS.enc.Latin1.parse(data)
        },
        CryptoJS.enc.Latin1.parse(key),
        {
            iv: CryptoJS.enc.Latin1.parse(iv),
            /** It used by default */
            // mode: CryptoJS.mode.CBC,
            /** Commented just for an example. You should use it*/
            // padding: CryptoJS.pad.ZeroPadding
        }
    );

    //console.log(CryptoJS.enc.Latin1.stringify(plaintextArray).length); // 64! (with ZeroPadding)

    return _wordArrayToArrayBuffer(plaintextArray);

    /** Or use it:
     * CryptoJS.enc.Latin1.stringify(plaintextArray));
     * CryptoJS.enc.Utf8.stringify(plaintextArray));
     * to get Latin1 (binary) or UTF8 string */
}

const decryptedArrayBuffer = decryptWithCryptoJS(data, key, iv);
console.log("Decrypted with CryptoJS [2]:\n");

console.log("\nResult:");
console.log(decryptedArrayBuffer);

console.log("\nResult Latin1:");
console.log(Util.arrayBufferToBinaryString(decryptedArrayBuffer));

console.log("\nResult UTF8:");
console.log(Util.arrayBufferToUtf8String(decryptedArrayBuffer));

console.log("\nResult length: " + decryptedArrayBuffer.length); // `64`, but `61` if uncomment padding specifying (ZeroPadding)


