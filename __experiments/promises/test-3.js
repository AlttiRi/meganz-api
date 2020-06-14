//import hooks from "./promise-hooks.js";
//hooks.enable();

// use await if needed
// use async if you use await

// async + await = +1 tier
// async = +1 tier (if a promise returns)
// async on a pure promise = +2 tiers


!async function demo2() {

    console.log("1");
    console.log(test0());
    console.log(test1());
    console.log(test2());
    console.log(test3());
    console.log("2");
    // 1
    // Promise { <pending> }
    // Promise { <pending> }
    // Promise { 'test2' }
    // Promise { 'test3' }
    // 2

    console.log();
    setTimeout(() => console.log("setTimeout"), 0);

    for (let i = 0; i < 10; i++) {
        tier2_1().then(console.log);
        tier3_1().then(console.log);
        tier3().then(console.log);
        tier4().then(console.log);
        tier5().then(console.log);
        tier2().then(console.log);
        tier1().then(console.log);
        test111().then(console.log);
        test6().then(console.log);
        test4().then(console.log);
        test3().then(console.log);
        test0().then(console.log);
        test1a().then(console.log);
        test3333().then(console.log);
        test333().then(console.log);
        test333aa().then(console.log);
        test33().then(console.log);
        test33a().then(console.log);
        test1().then(console.log);
        test2().then(console.log);
        test4().then(console.log);
        test6().then(console.log);
        test3333t5().then(console.log);
    }
}();

function tier1() {
    return new Promise(resolve => {
        resolve("tier_1");
    });
}

function tier2() {
    return new Promise(resolve => {
        Promise.resolve("tier_2")
            .then(value => resolve(value));
    });
}

function tier2_1() {
    return Promise.resolve("tier_2_1")
        .then(value => value); // `value => value` can be omitted
}

function tier3_1() {
    return new Promise(resolve => {
        Promise.resolve("tier_3")
            .then()
            .then(value => resolve(value));
    });
}

function tier3(x = "") {
    return Promise.resolve("tier_3_1" + x)
        .then()
        .then();
}

function tier4(x = "") {
    return Promise.resolve("tier_4" + x)
        .then()
        .then()
        .then();
}
function tier5(x = "") {
    return Promise.resolve("tier_5" + x)
        .then()
        .then()
        .then()
        .then();
}


// tier 1 // pure promise
function test2() {
    //return Promise.resolve("test2"); // the same
    return Promise.resolve(Promise.resolve("test2"));
}

// tier 1 // pure promise
async function test3(x = "") {
    return "test3" + x;
}

// tear1
function test111(x = "") {
    return test3("111a" + x);
}


// tear2
async function test1a() {
    return await Promise.resolve("test1a");
}

// tear2 !!!
async function test4() {
    return await Promise.resolve("test4");
}

// tear2
async function test6() {
    return await "test6";
}

// tear2 !!!
async function test33a(x = "") {
    return await test3("3a" + x);
}


// tear3
async function test0() {
    return Promise.resolve(Promise.resolve("test0"));
}

// tear3 !!!
async function test1() {
    return Promise.resolve("test1");
}

// tear3 !!!
async function test33(x = "") {
    return test3("3" + x);
}

// tear3
async function test333aa(x = "") {
    return await test33a("3aa" + x);
}

// tear4
async function test333(x = "") {
    return test33("3" + x);
}

// tear5
async function test3333(x = "") {
    return test333("3" + x);
}

// tear5
async function test3333t5(x = "") {
    return tier4("_3" + x);
}