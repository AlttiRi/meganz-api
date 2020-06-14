import {fetch} from "../../src/browser-context.js";
import Util from "../../src/util.js";
import Crypto from "../../src/crypto.js";
import MegaUtil from "../../src/mega-util.js";
import {saveFile} from "../../src/util-node.js";

// The test of downloading a thumbnail and a preview (file attributes)
!async function test() {

    // ------------------------------------------------------------------------------------------------
    // for "https://mega.nz/#!bkwkHC7D!AWJuto8_fhleAI2WG0RvACtKkL_s9tAtvBXXDUp2bQk"
    let fa = "924:1*sqbpWSbonCU/925:0*lH0B2ump-G8"; // "924", "925" - group id // fa - file attributes available for this file
    let nodeKey = new Uint8Array([42, 40, 254, 9, 99, 201, 174, 52, 226, 21, 90, 155, 81, 50, 2, 9]);
    // ------------------------------------------------------------------------------------------------

    let atNum = 0; // 0 - thumbnail (up to 200 px - square thumbnail, cropped from near center)
                   // 1 - preview  (up to 1000 px - scaled version inside 1000x1000 bounding square)
                   // it's "h" - handler id/num?
    let thumbnailId = fa.match(/(?<=:0\*).+?(?=\/|$)/)[0];
    let previewId   = fa.match(/(?<=:1\*).+?(?=\/|$)/)[0];

    console.log(thumbnailId, previewId);
// lH0B2ump-G8
// sqbpWSbonCU


    // get the download link
    const resp = await fetch("https://g.api.mega.co.nz/cs", {
        method: "post",
        body: JSON.stringify([{
            "a": "ufa",         // action: u ??? file attribute
            "fah": thumbnailId, // file attribute handler ???
            "ssl": 2,           // use https
            "r": 1              // r ??? – it adds "." in response url (without this dot the url does not work)
        }])
    });

    console.log(headers(resp));
// [
//         'access-control-allow-headers': 'Content-Type, MEGA-Chrome-Antileak',
//         'access-control-allow-origin': '*',
//         'access-control-expose-headers': 'Original-Content-Length',
//         'access-control-max-age': '86400',
//         connection: 'close',
//         'content-length': '123',
//         'content-type': 'application/json',
//         'original-content-length': '123'
// ]


    let downloadLink = (await resp.json())[0]["p"];
    console.log(downloadLink);
// https://gfs270n891.userstorage.mega.co.nz/.v9M_inQRPGeF3AIES08HwnBPOPhC-3rq0TTVk77EyXmJQae9smv9j3BM_THxKzmmyDsx8Q

    thumbnailId = MegaUtil.megaBase64ToBase64(thumbnailId);
    console.log(thumbnailId);
    thumbnailId = Util.base64ToBinaryString(thumbnailId);
    console.log(thumbnailId);
    thumbnailId = Util.binaryStringToArrayBuffer(thumbnailId);
    console.log(thumbnailId);
// lH0B2ump+G8=
// }Úé©øo
// Uint8Array(8) [148, 125, 1, 218, 233, 169, 248, 111]


    // get encrypted thumbnail/preview
    const resp2 = await fetch(downloadLink + "/" + atNum, {
        method: "post",
        body: thumbnailId,
        headers: {
            "connection": "keep-alive" // It's important for `node-fetch`
        }
    });
    console.log("", headers(resp2));
// [
//         'access-control-allow-headers': 'MEGA-Chrome-Antileak',
//         'access-control-allow-origin': '*',
//         'access-control-max-age': '86400',
//         'content-type': 'application/octet-stream',
//         'transfer-encoding': 'chunked'
// ]



    const responseBytes = new Uint8Array(await resp2.arrayBuffer());
    console.log("responseBytes", responseBytes);
// Uint8Array(2572) [
//     148, 125,   1, 218,  233, 169, 248, 111,    0,  10,   0,   0,  124, 113, 177, 188,
//      40,  73,  11, 185,  249, 199,  74,  35,   92, 172, 234, 197,  231, 152, 251, 239,


    let hashBytes = responseBytes.subarray(0, 8);
    console.log("hashBytes", hashBytes);
// Uint8Array(8) [148, 125,  1, 218, 233, 169, 248, 111]

    let lengthBytes = responseBytes.subarray(8, 12); // ???
    console.log("lengthBytes", lengthBytes);
// Uint8Array(4) [0, 10, 0, 0]

    console.log("thumbnail bytes count", Util.arrayBufferToLong(lengthBytes));
// 2560

    let thumbnailBytes = responseBytes.subarray(12);
    console.log("thumbnailBytes", thumbnailBytes);
// Uint8Array(2560) [
//     124, 113, 177, 188,  40,  73,  11, 185, 249, 199,  74,  35, 92, 172, 234, 197,
//     231, 152, 251, 239,  56, 107,  91, 130, 128, 115,  87,  69, 124,  53, 198,



    let decrypted = Crypto.decryptAES(thumbnailBytes, nodeKey, {padding: "ZeroPadding"});
    console.log(decrypted);
// Uint8Array(2546) [
//   255, 216, 255, 224,     0,  16,  74,  70,   73,  70,  0,   1,    1,   0,   0,   1,
//     0,   1,   0,   0,   255, 219,  0,   67,    0,  10,  7,   7,    8,   7,   6,  10,
//     8,   8,   8,  11,    10,  10,  11,  14,   24,  16,  14, 13,   13,  14,  29,  21,

    saveFile(decrypted, "123.jpg"); // -> temp/123.jpg


    // in case uncommenting – download necessary asmcrypto.js file and change the extension from "js" to "cjs"
    // await decryptLikeMegaDo(thumbnailBytes, nodeKey);

    async function decryptLikeMegaDo(data, key) {

        // ------------------
        // It's like Mega do:
        // Check:
        // `function str_to_ab(b)` and
        // `ab_parser: function (response, ev)`
        // in source code of Mega web client: https://github.com/meganz/webclient/

        // Download it:
        // https://raw.githubusercontent.com/meganz/webclient/master/js/vendor/asmcrypto.js
        // and put the file near and change the extension from "js" to "cjs".
        const asmCrypto = (await import("./asmcrypto.cjs")).default;

        let decryptedByASM = asmCrypto.AES_CBC.decrypt(data, key, false);
        console.log("asmCrypto:", decryptedByASM);
        // Uint8Array(2560) [...]

        // It works OK, but it does not remove the tailing zero padding (the size of the image is multiple 16)

        saveFile(decryptedByASM,"123_asm.jpg");
    }


    /**
     * @param response {Response}
     * @returns {[string]}
     */
    function headers(response) {
        const headers = [];
        response.headers.forEach((header, name) => {
            headers[name] = header;
        });
        return headers;
    }
}();