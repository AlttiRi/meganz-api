import {bundleText, dist, names} from "../settings.js";
import {bundle} from "../bundle.js";
import {prependBefore, sourcemap} from "../rollup-plugins.js";
import {workerWrapper} from "../worker.js";


export const browserStandalone = workerWrapper(_browserStandalone, import.meta.url);

function _browserStandalone() {
    return __browserStandalone(names.browserStandalone, names.esPure, names.esDependencies);
}
function __browserStandalone(filename, inputFilename, dependenciesFilename) {
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
            banner: `/*! The standalone browser bundle of ${bundleText}.*/`,
            format: "iife",
            name: "Mega"
        });
}