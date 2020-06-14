import Util from "../src/util.js";
import fs from "fs/promises";

/**
 * Save with Node.js API to `temp/` folder
 * @param {Uint8Array} arrayBuffer
 * @param {string} name
 * @param {number|Date} [mtime] - seconds  (Note: +new Date() === milliseconds)
 * @param {string[]} [path] - array of folders names
 * @returns <Promise<void>>
 */
export async function saveFile(arrayBuffer, name, mtime = null, path = []) {
    const safePath = path.map(Util.getSafeName);
    const pathStr = "temp/" + (safePath.length ? safePath.join("/") + "/" : "");
    console.log(`Saving "${name}" file to "${pathStr}" folder...`);

    await fs.mkdir(pathStr, {recursive: true});

    const safeName = Util.getSafeName(name);

    await fs.writeFile(pathStr + safeName, Buffer.from(arrayBuffer));
    if (mtime) {
        await fs.utimes(pathStr + safeName, new Date(), mtime);
    }
}
//todo {name, mtime, path} = {path: [], name: (+new Date()).toString()}