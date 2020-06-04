globalThis.log = console.log;
function htmlLog() {

    log(...arguments);

    const entry = document.createElement("div");
    entry.classList.add("console-entry");

    for (const argument of arguments) {

        const str = toString(argument);

        const block = document.createElement("pre");
        block.textContent = str;
        entry.append(block);
    }

    const root = document.querySelector("#console_log-to-html") || document.querySelector("body");

    root.append(entry);
    root.append(document.createElement("hr"));
}

function toString(argument) {
    if (typeof argument !== "object") {
        return argument;
    }

    try {
        function replacer(key, value) {
            if (key === "parent") { // to resolve the circular structure
                return undefined;
            }
            if (ArrayBuffer.isView(value)) {
                const name = value[Symbol.toStringTag] ?? value?.constructor.name;

                const array = [`${name}(${value.length}):`];
                let subArray = [];
                const max = 256;

                let i = 0;
                for (let elem of [...value.subarray(0, max)]) {
                    subArray.push(elem.toString().padStart(4));
                    i++;
                    if (i % 16 === 0) {
                        array.push(subArray.join(","));
                        subArray = [];
                    }
                }
                if (subArray.length > 0) {
                    array.push(subArray.join(","));
                }
                if (value.length > max) {
                    array.push("...");
                }

                //return `${name}([${array.join("\n")}])`;
                return array;
            }
            return value;
        }
        return JSON.stringify(argument, replacer, "  ");
    } catch(e) {
        console.error(e);
    }
}

console.log = htmlLog;