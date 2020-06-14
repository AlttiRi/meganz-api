const iv = new Uint8Array(16);

/**
 * Stupid Web Crypto API can't work with the text encoded without padding
 */
async function encryptWithWebCryptoAPI(dataArrayBuffer, keyArrayBuffer) {

    const iv = new Uint8Array(16); // zeros

    const key = await crypto.subtle.importKey(
        "raw",
        keyArrayBuffer,
        "AES-CBC",
        true,
        ["encrypt", "decrypt"]
    );

    // It will throw the exception for text without padding
    const decryptedBytes = await crypto.subtle.decrypt(
        {
            name: "AES-CBC",
            iv
        },
        key,
        dataArrayBuffer
    );

    return new TextDecoder().decode(decryptedBytes); // Yes, it is UTF-8 string
}