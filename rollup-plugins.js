import MagicString from "magic-string";
import fs from "fs";

export function sourcemap() {
    return {
        name: "use-sourcemap",
        async load(path) {
            const code = fs.readFileSync(path).toString();
            const map  = fs.readFileSync(path + ".map").toString();
            return {code, map};
        }
    };
}


/**
 * Allows to ignore module imports
 *
 * @param {String[]|String} names
 */
export function ignoreImportFrom(names) {
    return {
        name: "ignore-import", // currently works only with one line import
        transform(fileText) {
            const magicString = new MagicString(fileText);

            let regExpNames = "(?:" + (Array.isArray(names) ? names : [names]).join("|") + ")";
            regExpNames = regExpNames.replace("/", "\/");
            const regExp = new RegExp(`^\\s*import.+from\\s*["'].*${regExpNames}(?:.+js|)["']\\s*;?\\s*$`, "mg");

            for (const match of fileText.matchAll(regExp)) {
                const length = match[0].length;
                const index = match.index;
                magicString.overwrite(index, index + length, "");
            }

            const code = magicString.toString();
            const map = magicString.generateMap({
                hires: true
            });
            return {code, map};
        }
    };
}


/**
 * Prepend a text before Rollup start to handle the file
 *
 * @param {String} text
 * @param {String} filename
 */
export function prependBefore(text, filename) {
    filename = filename.replace(".", "\\.");

    return {
        name: "prepend-text",
        transform(fileText, path) {
            if (!path.match(new RegExp(`\\\\${filename}`))) {
                return null;
            }

            const magicString = new MagicString(fileText);
            magicString.prepend(text);

            const code = magicString.toString();
            const map = magicString.generateMap({
                hires: true,
            });
            return {code, map};
        }
    };
}


// It's used to append `//# sourceMappingURL=name.js.map`
export function appendFinally(text) {
    return {
        name: "append-text-before-end",
        renderChunk(code, chunkInfo, outputOptions) {
            if (!code) {
                return null;
            }

            const magicString = new MagicString(code);
            magicString.append(text);
            code = magicString.toString();
            const map = magicString.generateMap({hires: true});
            return {code, map};
        }
    };
}

// It works as the `outputOptions.banner` option
export function prependFinally(text) {
    return {
        name: "prepend-text-before-end",
        renderChunk(code, chunkInfo, outputOptions) {
            if (!code) {
                return null;
            }

            const magicString = new MagicString(code);
            magicString.prepend(text);
            code = magicString.toString();
            const map = magicString.generateMap({hires: true});
            return {code, map};
        }
    };
}