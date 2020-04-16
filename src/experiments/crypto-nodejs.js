const {encryptedStr1: data, key, iv} = require("./data");


/** @returns {Promise<string>} */
function decryptWithNodejsCrypto(data, key, iv, usePadding = true, algorithm = "aes-128-cbc") {
    const crypto = require("crypto");
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAutoPadding(usePadding);

    let promiseResolver;
    const promise = new Promise((resolve, reject) => {
        promiseResolver = resolve;
    });

    let decryptedString = "";
    decipher.on("readable", () => {
        let chunk;
        while (null !== (chunk = decipher.read())) {
            decryptedString += chunk.toString("utf8");
        }
    });
    decipher.on("end", () => {
        promiseResolver(decryptedString);
    });

    decipher.write(data);
    decipher.end();

    return promise;
}

decryptWithNodejsCrypto(data, key, iv, false)
    .then(decrypted => {
        console.log("Decrypt with Node.js Crypto:\n");
        console.log(decrypted);
        console.log(decrypted.length); // 64 for ZeroPadding, and no option to specify the padding type
    });