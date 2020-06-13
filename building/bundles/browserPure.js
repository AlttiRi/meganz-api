import {bundle} from "../bundle.js";
import {bundleText, names, src} from "../settings.js";
import {ignoreImportFrom, prependBefore} from "../rollup-plugins.js";
import {workerWrapper} from "../worker.js";


export const browserPure = workerWrapper(_browserPure, import.meta.url);

function _browserPure() {
    return bundle(
        names.browserPure,
        {
            input: src + "mega.js",
            plugins: [
                ignoreImportFrom(["dependencies/", "browser-context"])  // "util-node" is tree shaken
            ],
        },
        {
            banner: `/*! The pure browser bundle of ${bundleText}. It requires CryptoJS. */`,
            format: "iife",
            name: "Mega"
        });
}

// It does almost the same thing
function browserPureV2() {
    return bundle(
        names.browserPure,
        {
            input: src + "mega.js",
            plugins: [
                ignoreImportFrom(["dependencies/", "browser-context"]),
                prependBefore(`import CryptoJS from "CryptoJS";`, "crypto.js"),
            ],
            external: ["CryptoJS"]
        },
        {
            banner: `/*! The pure browser bundle of ${bundleText}. It requires CryptoJS. */`,
            format: "iife",
            name: "Mega",
            globals: {
                "CryptoJS": "CryptoJS"
            },
            interop: false // does not work
        });
}