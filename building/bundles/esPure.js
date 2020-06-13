import {bundle} from "../bundle.js";
import {bundleText, names, src} from "../settings.js";
import {ignoreImportFrom} from "../rollup-plugins.js";
import {workerWrapper} from "../worker.js";


export const esPure = workerWrapper(_esPure, import.meta.url);

function _esPure() {
    return bundle(
        names.esPure,
        {
            input: src + "mega.js",
            plugins: [
                ignoreImportFrom(["dependencies/", "browser-context"])
            ]
        },
        {
            banner: `/*! The pure ES bundle of ${bundleText}. It requires CryptoJS. */`
        }, {
            module: true
        });
}