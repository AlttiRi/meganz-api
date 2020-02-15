let array = new Uint8Array([42, 40, 254, 9, 99, 201, 174, 52, 226, 21, 90, 155, 81, 50, 2, 9]);

printArrayBuffer(array);

function printArrayBuffer(array) {

    const nodeKey = [...array];
    const count = 256 < nodeKey.length ? 256 : nodeKey.length;

    let result = "";

    for (let i = 0; i < count; i++) {
        let n = nodeKey[i];
        result += _pad(n) + n + ", ";
        if ((i + 1) % 8 === 0) {
            result += "\n"
        }
    }
    function _pad(i) {
        let c = (3 - i.toString().length);
        return " ".repeat(c);
    }

    console.log(result);
}

