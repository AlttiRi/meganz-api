import {bundleText, dist, names, src} from "../settings.js";
import {bundle} from "../bundle.js";
import {ignoreImportFrom, prependBefore, sourcemap} from "../rollup-plugins.js";
import resolve from "rollup-plugin-node-resolve";
import {workerWrapper} from "../worker.js";


export const esStandalone = workerWrapper(_esStandalone, import.meta.url);


function _esStandalone() {
    return __esStandalone(names.esStandalone, names.esPure, names.esDependencies);
}

function __esStandalone(filename, inputFilename, dependenciesFilename) {
    return bundle(
        filename,
        {
            input: `${dist}${inputFilename}.js`,
            plugins: [
                prependBefore(`import {CryptoJS} from "./${dependenciesFilename}.min.js";`, `${inputFilename}.js`),
                sourcemap()
            ]
        },
        {
            banner: `/*! The standalone ES bundle of ${bundleText}.*/`
        }, {
            module: true
        });
}

// The same, except the dependencies code is not minified in the non-min version.
function _esStandaloneV2() {
    return bundle(
        names.esStandalone,
        {
            input: src + "mega.js",
            plugins: [
                ignoreImportFrom(["browser-context"]),
                resolve()
            ]
        },
        {
            banner: `/*! The standalone ES bundle of ${bundleText}.*/`
        }, {
            module: true
        });
}
