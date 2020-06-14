import {bundleText, cryptoEsText, dist, names} from "../settings.js";
import {bundle} from "../bundle.js";
import {prependBefore, sourcemap} from "../rollup-plugins.js";


export function browserStandalone() {
    return _browserStandalone(names.browserStandalone, names.esPure, names.esDependencies);
}

function _browserStandalone(filename, inputFilename, dependenciesFilename) {
    const banner = `/* The standalone browser bundle of ${bundleText}.\n` +
     ` * Dependencies:${[cryptoEsText].map(str => " " + str).join("; ")}.*/`;
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
            banner,
            format: "iife",
            name: "Mega"
        }, {
            output: {
                preamble: banner
            }
        });
}