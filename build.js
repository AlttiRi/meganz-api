import fs from "fs";
import Util from "./src/util.js";
import progress from "./src/examples/promise-progress.js";

import {ignoreImportFrom, prependBefore, sourcemap, appendFinally, prependFinally} from "./rollup-plugins.js";
import resolve from "rollup-plugin-node-resolve";

import {rollup} from "rollup";
import terser from "terser";


const bundleText   = "MegaNzApi 0.2.0, Licence MIT (https://github.com/alttiri/meganz-api/blob/master/LICENSE)"
const cryptoEsText = "CryptoES 1.1.0, Licence MIT (https://github.com/entronad/crypto-es/blob/master/LICENSE)"


function browserBundlePure(filename) {
    return bundle(
        {
            input: "./src/mega.js",
            name: filename,
            format: "iife",
            outputName: "Mega",
            outputExports: "named",
            plugins: [
                ignoreImportFrom(["dependencies/", "browser-context"])  // "util-node" is tree shaken
            ],
            banner: `/*! The pure browser bundle of ${bundleText}. It requires CryptoJS. */`
        },{module: false});
}
// It does almost the same thing
function browserBundlePureV2(filename) {
    return bundle(
        {
            input: "./src/mega.js",
            name: filename,
            format: "iife",
            outputName: "Mega",
            outputExports: "named",
            plugins: [
                ignoreImportFrom(["dependencies/", "browser-context"]),
                prependBefore(`import CryptoJS from "CryptoJS";`, "crypto.js"),
            ],
            banner: `/*! The pure browser bundle of ${bundleText}. It requires CryptoJS. */`,
            outputGlobals: {
                "CryptoJS": "CryptoJS"
            },
            interop: false, // does not work
            external: ["CryptoJS"],
        },{
            module: false
        });
}

function esBundlePure(filename) {
    return bundle(
        {
            input: "./src/mega.js",
            name: filename,
            plugins: [
                ignoreImportFrom(["dependencies/", "browser-context"])
            ],
            banner: `/*! The pure ES bundle of ${bundleText}. It requires CryptoJS. */`
        });
}


function esBundleDependencies(filename) {
    return bundle(
        {
            input: "./src/dependencies/all.js",
            name: filename,
            plugins: [
                resolve()
            ],
            // The ES bundle of the dependencies.
            banner: `/*! The dependencies:\n${[cryptoEsText].map(str => " " + str).join(";\n")} */`
        });
}

// Bundle for the browser CryptoES as CryptoJS with only necessary modules
// I can't bundle "./src/dependencies/all.js" and expose CryptoJS object (May be possible to write a plugin for it?)
function browserBundleCryptoES(filename) {
    return bundle(
        {
            input: "./src/dependencies/crypto-es.js",
            name: filename,
            plugins: [
                resolve()
            ],
            banner: `/*! ${cryptoEsText} */`,

            format: "iife",
            outputName: "CryptoJS"
        }, {
            module: false
        });
}

function esBundleStandalone(filename, inputFilename, dependenciesFilename) {
    return bundle(
        {
            input: `./dist/${inputFilename}.js`,
            name: filename,
            plugins: [
                prependBefore(`import {CryptoJS} from "./${dependenciesFilename}.min.js";`, `${inputFilename}.js`),
                sourcemap()
            ],
            banner: `/*! The standalone ES bundle of ${bundleText}.*/`
        });
}
// The same, except the dependencies code is not minified in the non-min version.
function esBundleStandaloneV2(filename) {
    return bundle(
        {
            input: `./src/mega.js`,
            name: filename,
            plugins: [
                ignoreImportFrom(["browser-context"]),
                resolve()
            ],
            banner: `/*! The standalone ES bundle of ${bundleText}.*/`
        });
}

function browserBundleStandalone(filename, inputFilename, dependenciesFilename) {
    return bundle(
        {
            input: `./dist/${inputFilename}.js`,
            name: filename,
            plugins: [
                prependBefore(`import {CryptoJS} from "./${dependenciesFilename}.min.js";`, `${inputFilename}.js`),
                sourcemap()
            ],
            banner: `/*! The standalone browser bundle of ${bundleText}.*/`,
            format: "iife",
            outputName: "Mega"
        }, {
            module: false
        });
}


// Note: "min" versions have a bit broken sourcemaps, I think it's the Terser problem.
async function build() {
    fs.mkdirSync("./dist/", {recursive: true});

    // Both bundles use CryptoJS from the browser context
    const browserBundleName = "mega.pure"; // [used-in-release]
    const esBundleName = "_mega.pure.es";  // [used-in-building]

    const esBundleDependenciesName = "_dependencies.es"; // [used-in-building]
    const browserBundleCryptoESName = "crypto-es-cut";   // [used-in-release]

    const esBundleStandaloneName = "__mega.es";   // [unused]
    const browserBundleStandaloneName = "mega"; // [used-in-release]

    // ----------------------------------------

    const es = Promise.all([
        // The bundle without dependencies. Note it does NOT contain the dependency `import`
        esBundlePure(esBundleName),

        // Only dependencies, it is needed only for the next operations
        esBundleDependencies(esBundleDependenciesName),
    ]);

    const browser = Promise.all([
        // Create the bundle that requires CryptoJS (the bundle uses CryptoJS from the browser context)
        browserBundlePure(browserBundleName),

        // Create the bundle of CryptoES, only the needed functional
        browserBundleCryptoES(browserBundleCryptoESName),
    ]);

    // ----------------------------------------

    await es;

    // I don't think that this bundle is needed
    await esBundleStandalone(esBundleStandaloneName, esBundleName, esBundleDependenciesName);

    // Just the standalone browser bundle (Note: CryptoES code is minified in the non minified bundle)
    await browserBundleStandalone(browserBundleStandaloneName, esBundleName, esBundleDependenciesName);

    // ----------------------------------------

    await browser;
}


!async function main() {
    console.time("build");
    await progress(build(),"Building...");
    console.timeEnd("build");
}();


async function bundle({
                          input, format = "es",
                          banner = null, plugins = [], name,
                          outputName, outputGlobals, outputExports,
                          external
                      },
                      terserOptions = {}) {
    plugins.push(appendFinally(sourceMappingURL(name + ".js")));

    const inputOptions = {
        external,
        input,
        plugins
    };
    const outputOptions = {
        format,
        banner,
        sourcemap: true,
        name: outputName,
        globals: outputGlobals,
        exports: outputExports
    };

    const result = await rollupGenerate(inputOptions, outputOptions);
    write(name + ".js", result.code, result.map);

    const _terserOptions = {
        //preamble: banner
    };
    Object.assign(_terserOptions, terserOptions);

    const resultMin = await minifyWithTerser(result.code, result.map, name + ".min.js", _terserOptions);
    write(name + ".min.js", resultMin.code, resultMin.map);
}

function minifyWithTerser(code, map, name, {preamble, module, toplevel, compress, beautify} = {}) {
    preamble = preamble ?? null;
    module   = module   ?? true;
    toplevel = toplevel ?? false;
    compress = compress ?? true;
    beautify = beautify ?? false;

    const sourceMap = map ? {
        content: map,
        url: name + ".map"
    } : null;

    const options = {
        toplevel,
        compress,
        module,
        output: {
            beautify,
            preamble
        },
        sourceMap
    };
    return tenserMinify(code, options);
}

async function tenserMinify(code, options) {
    await Util.nextEventLoopTask();
    const result = terser.minify(code, options);

    if (result.error) {
        console.error(result.error);
    }
    if (result.warnings) {
        console.error(result.warnings);
    }
    if (!result.code) {
        throw Error("No code");
    }

    return {
        code: result.code,
        map: result.map
    };
}

async function rollupGenerate(inputOptions, outputOptions) {
    await Util.nextEventLoopTask();
    const build = await rollup(inputOptions);

    await Util.nextEventLoopTask();
    const result = await build.generate(outputOptions);

    let map = result.output[0].map;
    map = changeSourceMapPaths(map);
    map = JSON.stringify(map);
    return {
        code: result.output[0].code,
        map
    };
}

function changeSourceMapPaths(map) {
    for (let i = 0; i < map.sources.length; i++) {
        map.sources[i] = map.sources[i]
            .replace("src", "mega-api")
            .replace("crypto-es\/lib", "crypto-es")
            .replace("node_modules\/", "")
            .replace("dist\/", "");
    }
    return map;
}

function sourceMappingURL(name) {
    return `\n//# sourceMappingURL=${name}.map`
}

function write(name, code, map) {
    if (map) {
        fs.writeFileSync(`./dist/${name}`, code);
        fs.writeFileSync(`./dist/${name}.map`, map);
    } else {
        fs.writeFileSync(`./dist/${name}`, code);
    }
}






