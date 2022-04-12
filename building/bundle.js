import fs from "fs/promises";
import Util from "../src/util.js";

import {appendFinally} from "./rollup-plugins.js";
import {dist, pathMap} from "./settings.js";

import {rollup} from "rollup";
import terser from "terser";


/**
 * @param {string} filename
 * @param {import("rollup").InputOptions} inputOptions
 * @param {import("rollup").OutputOptions} outputOptions
 * @param {import("terser").MinifyOptions} terserOptions
 * @returns {Promise<{filename, result, resultMin}>}
 */
export async function bundle(filename, inputOptions, outputOptions = {}, terserOptions = {}) {
    /** @type {import("rollup").OutputOptions} */
    const _outputOptions = {sourcemap: true};
    Object.assign(_outputOptions, outputOptions);

    inputOptions.plugins.push(appendFinally(sourceMappingURL(filename)));

    const result = await rollupGenerate(inputOptions, _outputOptions);
    const written = write(filename + ".js", result.code, result.map);


    const resultMin = await minifyWithTerser(result.code, result.map, filename + ".min.js", terserOptions);
    const writtenMin = write(filename + ".min.js", resultMin.code, resultMin.map);

    await Promise.all([written, writtenMin]);

    return {filename, result, resultMin};
}

/**
 *
 * @param {string} code
 * @param {string} map
 * @param {string} name
 * @param {import("terser").MinifyOptions} terserOptions
 * @returns {Promise<{code: string, map: string}>}
 */
function minifyWithTerser(code, map, name, terserOptions = {}) {
    /** @type {import("terser").SourceMapOptions} */
    const sourceMap = map ? {
        content: map,
        url: name + ".map",
        includeSources: true
    } : null;

    /** @type {import("terser").MinifyOptions} */
    const _terserOptions = {
        sourceMap,
        compress: false, // for workable sourceMap
        mangle: true
    };

    Object.assign(_terserOptions, terserOptions);
    return tenserMinify(code, _terserOptions);
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


/**
 * @param {import("rollup").InputOptions} inputOptions
 * @param {import("rollup").OutputOptions} outputOptions
 * @returns {Promise<{code: string, map: string}>}
 */
async function rollupGenerate(inputOptions, outputOptions) {
    await Util.nextEventLoopTask();
    const build = await rollup(inputOptions);

    await Util.nextEventLoopTask();
    const result = await build.generate(outputOptions);

    /** @type {import("rollup").SourceMap} */
    let map = result.output[0].map;
    map = changeSourceMapPaths(map);

    return {
        code: result.output[0].code,
        map: JSON.stringify(map)
    };
}

function changeSourceMapPaths(map) {
    function _beautify(str) {
        return pathMap.reduce((pre, [value, replacer]) => {
            return pre.replace(value, replacer)
        }, str);
    }

    for (let i = 0; i < map.sources.length; i++) {
        // map.sources[i] = map.sources[i]
        //     .replace("src", "mega-api")
        //     .replace("crypto-es\/lib", "crypto-es")
        //     .replace("node_modules\/", "")
        //     .replace(dist, "")
        //     .replace("..\/", "");
        map.sources[i] = _beautify(map.sources[i]);
    }
    return map;
}

function sourceMappingURL(name, ext = "js") {
    return `\n//# sourceMappingURL=${name}.${ext}.map`
}


async function write(name, code, map) {
    await fs.mkdir(dist, {recursive: true});
    await fs.writeFile(`${dist}${name}`, code);
    if (map) {
        await fs.writeFile(`${dist}${name}.map`, map);
    }
}