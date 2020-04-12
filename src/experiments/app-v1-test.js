const { btoa, atob, fetch } = require("../browser-context");
const { util } = require("../util");
const logger = util.logger;
const { mega } = require("../mega");


!async function app() {
    try {

        let link;
        link = "https://mega.nz/#!bkwkHC7D!AWJuto8_fhleAI2WG0RvACtKkL_s9tAtvBXXDUp2bQk"; // a cat jpg
        //link = "https://mega.nz/#F!e1ogxQ7T!ee4Q_ocD1bSLmNeg9B6kBw"; // a cats folder // not works with folder currently

// ---------------------------------------------------------------------------------------------------------------------

        const {
            id,
            decryptionKeyStr,
            isFolder,
            selectedFolderId,
            selectedFileId
        } = mega.parseUrl(link);

        logger.debug(isFolder, id, decryptionKeyStr, selectedFolderId, selectedFileId);

    // false
    // bkwkHC7D
    // AWJuto8_fhleAI2WG0RvACtKkL_s9tAtvBXXDUp2bQk
    //
    //

// ---------------------------------------------------------------------------------------------------------------------

        console.log("Decode decryption key...");
        const decryptionKey = mega.megaBase64ToArrayBuffer(decryptionKeyStr);


        logger.debug("decryptionKey:", decryptionKey);
    // Uint8Array(32) [  1,  98, 110, 182, 143,  63, 126,  25,  94,   0, 141, 150,  27,  68, 111,   0,
    //                  43,  74, 144, 191, 236, 246, 208,  45, 188,  21, 215,  13,  74, 118, 109,   9]

// ---------------------------------------------------------------------------------------------------------------------

        console.log("Parse decryption key...");
        const { iv, metaMac, key: nodeKey } = mega.decryptionKeyToParts(decryptionKey);

        logger.debug("iv:", iv, "metaMac:", metaMac, "nodeKey:", nodeKey);

    // Uint8Array(8)  [ 43,  74, 144, 191, 236, 246, 208,  45]
    // Uint8Array(8)  [188,  21, 215,  13,  74, 118, 109,   9]
    // Uint8Array(16) [ 42,  40, 254,   9,  99, 201, 174,  52, 226,  21,  90, 155,  81,  50,   2,   9]

// ---------------------------------------------------------------------------------------------------------------------

        console.log("Fetching JSON...");

        const response = await fetch("https://g.api.mega.co.nz/cs", { // dl_res
            method: "post",
            body: JSON.stringify([{
                "a": "g",     // Command type
                "p": id,      // Content ID
                "g": 1,       // The download link
                //"v": 2,     // Multiple links for big files
                "ssl": 2      // HTTPS for the download link. // Use `2` or `1`?
            }])
        });

        const json = await response.json();
        const {
            s:   size,
            at:  serializedAttributes,     // Node attr (name, hash -> mtime)
            fa:  fileAttributesEncoded,    // File attr (thumbnail, preview)
            g:   downloadUrl,
            efq: EFQ, // Something about the Quota ??? Quota enforcement
            msd: MSD  // "MegaSync download"
        } = json[0];

        logger.debug("s   " + size, "at  " + serializedAttributes, "fa  " + fileAttributesEncoded,
                     "g   " + downloadUrl, "efq " + EFQ, "msd " + MSD);

    // s   523265
    // at  ZlDcSbnpVQfDxIlrQZaioVBSGhJu972wI8WMBIpLn8VLWIMX631gUSmq3C1ANx5EJwZwwvPRsa02RxWsPpNwTA
    // fa  924:1*sqbpWSbonCU/925:0*lH0B2ump-G8
    // g   https://gfs204n140.userstorage.mega.co.nz/dl/XSjxxsrEd0o3FwJvXdVwrWN8A1U4fx6T44STSQjMxVh0viSbPPIhIN2dpgIOqHIBKrrlZT_8LXlGcD4aaXcq6ixxZDBuaNEVwlVW4zyPmRBdie6ksg4W38E5uz9hMA
    // efq 1
    // msd 1

// ---------------------------------------------------------------------------------------------------------------------

        const attributesEncrypted = util.base64BinaryStringToArrayBuffer(serializedAttributes);
        logger.debug("attributesEncrypted:", attributesEncrypted);

    // Uint8Array(64)
    // [102,  80, 220,  73, 185, 233,  85,   7, 195, 196, 137, 107,  65, 150, 162, 161,
    //   80,  82,  26,  18, 110, 247, 189, 176,  35, 197, 140,   4, 138,  75, 159, 197,
    //   75,  88, 131,  23, 235, 125,  96,  81,  41, 170, 220,  45,  64,  55,  30,  68,
    //   39,   6, 112, 194, 243, 209, 177, 173,  54,  71,  21, 172,  62, 147, 112,  76]


// ---------------------------------------------------------------------------------------------------------------------

        console.log("Decryption of attributes...");

        const attributesArrayBuffer = util.decryptAES(attributesEncrypted, nodeKey, {padding: "ZeroPadding"});

        const attributesPlane = util.arrayBufferToUtf8String(attributesArrayBuffer);

        logger.debug("Attributes:", attributesArrayBuffer, attributesPlane);

    // Uint8Array(61) [
    //  77,  69,  71,  65, 123,  34, 110,  34,  58,  34,  83,  104,  97, 114, 101, 100,
    //  70, 105, 108, 101,  46, 106, 112, 103,  34,  44,  34,   99,  34,  58,  34,  71,
    //  82,  83,  77,  56,  43,  99,  49,  72,  85, 109, 108,  109, 121,  68, 117,  84,
    //  74,  86, 114,  68, 119,  83,  68, 112, 113,  82,  86,   34, 125]
    // MEGA{"n":"SharedFile.jpg","c":"GRSM8+c1HUmlmyDuTJVrDwSDpqRV"}

// ---------------------------------------------------------------------------------------------------------------------

        console.log("Parsing of Attributes...");
        const { n: name, c: serializedFingerprint } = JSON.parse(attributesPlane.substring("MEGA".length));

        logger.debug(name, serializedFingerprint);

    // SharedFile.jpg
    // GRSM8+c1HUmlmyDuTJVrDwSDpqRV  // node hash + mtime


        const fingerprintBytes = util.base64BinaryStringToArrayBuffer(serializedFingerprint);
        logger.debug(fingerprintBytes);

    // Uint8Array(21) [
    //      25,  20, 140, 243,
    //     231,  53,  29,  73,
    //     165, 155,  32, 238,
    //      76, 149, 107,  15,
    //      4,  131, 166, 164,  85]



        const fileChecksum    = fingerprintBytes.subarray(0, 16); // 4 CRC32 of the file (unused)
        const timeBytesLength = fingerprintBytes[16];             // === 4, and 5 after 2106.02.07
        const timeBytes       = fingerprintBytes.subarray(17, 17 + timeBytesLength); // in fact, no data after this is

        // I don't think that it is necessary, but let it be
        !function _verifyTimeBytesLength() {
            if (timeBytesLength > 5 || fingerprintBytes.length > fileChecksum.length + 1 + timeBytes.length) {
                throw "Invalid value: timeBytesLength = " + timeBytesLength;
            }
        }();



        const modificationDateSeconds = util.arrayBufferToLong(timeBytes);
        logger.debug(modificationDateSeconds);
    // 1436853891

        logger.debug(new Date(modificationDateSeconds * 1000).toLocaleString());
    // 14.07.2015, 09:04:51

        // I prefer this format
        logger.debug(util.secondsToFormattedString(modificationDateSeconds));
    // 2015.06.14 09:04:51


    } catch(e) { console.log("<ERROR>", e); }
}();