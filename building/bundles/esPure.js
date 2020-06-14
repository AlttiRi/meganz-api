import {bundle} from "../bundle.js";
import {names, src} from "../settings.js";
import {ignoreImportFrom} from "../rollup-plugins.js";


/** This bundle is only needed for bundling other ones. */
export function esPure() {
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