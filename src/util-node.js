import Util from "./util.js";
import fs from "fs";

/**
 * Save with Node.js API to `temp/` folder
 * @param {Uint8Array} arrayBuffer
 * @param {string} name
 * @param {number|Date} [mtime]
 * @param {string[]} [path] - array of folders names
 */
export function saveFile(arrayBuffer, name, mtime = new Date(), path = []) {
    const safePath = path.map(Util.getSafeName);
    const pathStr = "temp/" + (safePath.length ? safePath.join("/") + "/" : "");
    console.log(`Saving "${name}" file to "${pathStr}" folder...`);

    fs.mkdirSync(pathStr, {recursive: true});

    const safeName = Util.getSafeName(name);

    fs.writeFileSync(pathStr + safeName, Buffer.from(arrayBuffer));
    fs.utimesSync(pathStr + safeName, new Date(), mtime);
}