!async function demo() {
    for (let i = 0; i < 10; i++) {
        /* the order is not important */
        w1().then(console.log);
        w2().then(console.log);
        q2().then(console.log);
        w3().then(console.log);
        q3().then(console.log);
        one().then(console.log);
        two().then(console.log);
        three().then(console.log);
    }
}();

// return 1 Promise
async function w1(x = "") {
    return x + "w1 ";
}
function q1(x = "") { // the same
    return Promise.resolve(x + "q1 ");
}

// return 2 Promises (the chain of them)
async function w2(x = "") {
    return await (x + "w2 ");
}
async function q2(x = "") { // the same
    return await q1(x + "q2 ");
}

// return 3 Promises (the chain of them)
async function w3(x = "") {
    return Promise.resolve(x + "w3 ");
}
async function q3(x = "") { // the same
    return w1(x + "q3 ");
}


function one() {
    return Promise.resolve("one");
}
function two() {
    return Promise.resolve("two")
                  .then();
}
function three() {
    return Promise.resolve("three")
                  .then()
                  .then();
}

// w1
// one
// w1
// one
// ...
// w2
// q2 q1
// two
// w2
// q2 q1
// two
// ...
// w3
// q3 w1
// three
// w3
// q3 w1
// three
// ...