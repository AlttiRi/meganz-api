import {bundle} from "../bundle.js";
import {cryptoEsText, names, src} from "../settings.js";
import resolve from "rollup-plugin-node-resolve";
import {workerWrapper} from "../worker.js";


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
            banner: `/*! The dependencies:${[cryptoEsText].map(str => " " + str).join("; ")}.*/`
        }, {
            module: true
        });
}