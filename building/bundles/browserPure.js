import {bundle} from "../bundle.js";
import {bundleText, names, src} from "../settings.js";
import {ignoreImportFrom, prependBefore} from "../rollup-plugins.js";
import {workerWrapper} from "../worker.js";


export const browserPure = workerWrapper(_browserPure2, import.meta.url);

function _browserPure() {
    const banner = `/* The pure browser bundle of ${bundleText}. It requires CryptoJS. */`
    return bundle(
        names.browserPure,
        {
            input: src + "mega.js",
            plugins: [
                ignoreImportFrom(["dependencies/", "browser-context"])
            ],
        },
        {
            banner,
            format: "iife",
            name: "Mega"
        }, {
            output: {
                preamble: banner
            }
        });
}

// It does almost the same thing, but IIFE expects `CryptoJS` as argument.
function _browserPure2() {
    const external = "crypto-js"; // or use "crypto-es" [?]
    return bundle(
        names.browserPure,
        {
            input: src + "mega.js",
            plugins: [
                ignoreImportFrom(["dependencies/", "browser-context"]),
                prependBefore(`import CryptoJS from "${external}";`, "crypto.js"),
            ],
            external: [external]
        },
        {
            banner: `/* The pure browser bundle of ${bundleText}. */`,
            format: "iife",
            name: "Mega",
            globals: {
                [external]: "CryptoJS"
            },
            interop: false
        });
}