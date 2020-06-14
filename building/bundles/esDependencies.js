import {bundle} from "../bundle.js";
import {names, src} from "../settings.js";
import resolve from "rollup-plugin-node-resolve";


/** This bundle is only needed for bundling other ones. */
export function esDependencies() {
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