import {bundle} from "../bundle.js";
import {names, src} from "../settings.js";
import resolve from "rollup-plugin-node-resolve";
import {workerWrapper} from "../worker.js";

/** This bundle is only needed for bundling other ones. */
export const esDependencies = workerWrapper(_esDependencies, import.meta.url);

function _esDependencies() {
    return bundle(
        names.esDependencies,
        {
            input: src + "dependencies/all.js",
            plugins: [
                resolve()
            ]
        },
        {

        }, {
            module: true
        });
}