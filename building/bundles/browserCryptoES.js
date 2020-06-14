import {bundle} from "../bundle.js";
import {cryptoEsText, names, src} from "../settings.js";
import resolve from "rollup-plugin-node-resolve";


// Bundle for the browser CryptoES as CryptoJS with only necessary modules
// I can't bundle "./src/dependencies/all.js" and expose CryptoJS object (May be possible to write a plugin for it?)
export function browserCryptoES() {
    const banner = `/* ${cryptoEsText}. */`;
    return bundle(
        names.browserCryptoES,
        {
            input: src + "dependencies/crypto-es.js",
            plugins: [
                resolve()
            ],
        },
        {
            banner,
            format: "iife",
            name: "CryptoJS"
        }, {
            output: {
                preamble: banner
            }
        });
}