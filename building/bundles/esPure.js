import {bundle} from "../bundle.js";
import {names, src} from "../settings.js";
import {ignoreImportFrom} from "../rollup-plugins.js";
import {workerWrapper} from "../worker.js";

/** This bundle is only needed for bundling other ones. */
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

        }, {
            module: true
        });
}