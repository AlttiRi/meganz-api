import {bundleText, cryptoEsText, dist, names, src} from "../settings.js";
import {bundle} from "../bundle.js";
import {ignoreImportFrom, prependBefore, sourcemap} from "../rollup-plugins.js";
import resolve from "rollup-plugin-node-resolve";


/** This bundle is only needed for bundling other ones. */
export function esStandalone() {
    return _esStandalone1(names.esStandalone, names.esPure, names.esDependencies);
}

function _esStandalone1(filename, inputFilename, dependenciesFilename) {
    const banner = `/* The standalone browser bundle of ${bundleText}.\n` +
        ` * Dependencies: ${[cryptoEsText].map(str => " " + str).join("; ")}.*/`;
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
            banner
        }, {
            module: true,
            output: {
                preamble: banner
            }
        });
}

// The same, except the dependencies code is not minified in the non-min version.
function _esStandalone2() {
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
