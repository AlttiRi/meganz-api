import {encryptedStr1 as data, key, iv} from "./data.js";
import crypto from "crypto";


/** @returns {Promise<string>} */
function decryptWithNodejsCrypto(data, key, iv, usePadding = true, algorithm = "aes-128-cbc") {

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAutoPadding(usePadding);

    let promiseResolver;
    const promise = new Promise((resolve) => {
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