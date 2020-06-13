export const names = {
    // Both bundles use CryptoJS from the browser context
    browserPure: "mega.pure", // [used-in-release]
    esPure: "_mega.pure.es",  // [used-in-building]

    esDependencies: "_dependencies.es", // [used-in-building]
    browserCryptoES: "crypto-es-cut",   // [used-in-release]

    esStandalone: "__mega.es",   // [unused]
    browserStandalone: "mega",   // [used-in-release]
}

export const bundleText   = "MegaNzApi 0.2.0, Licence MIT (https://github.com/alttiri/meganz-api/blob/master/LICENSE)"
export const cryptoEsText = "CryptoES 1.1.0, Licence MIT (https://github.com/entronad/crypto-es/blob/master/LICENSE)"

export const src = "./src/";
export const dist = "dist/"; // dist folder name

export const pathMap = [
    ["src", "mega-api"],
    ["crypto-es/lib", "crypto-es"],
    ["node_modules/", ""],
    [dist, ""],
    ["../", ""]
];
