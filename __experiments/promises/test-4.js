async function test1() {
    const p1 = testChar("$");
    const p2 = testChar("#");
    return Promise.all([p1, p2]);
}

async function testChar(s) {
    console.log(s);   // 1
    const promise = new Promise(resolve => {
        console.log(s + "_");   // 2
        setTimeout(resolve, 700);   // 4
    });
    console.log(s + "__");   // 3
    await promise;

    for (let i = 0; i < 20; i++) {
        process.stdout.write(s);
        await sleep(100);
    }
}


//---------------------------------------------------------------------------

function sleep(ms) { // tear 1 promise
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sleep2(ms) { // tear 2 promise
    const promise = Promise.resolve();
    return promise.then(_ => new Promise(resolve => setTimeout(resolve, ms)));
}


!async function test2() {
    await test1();

    await sleep(250);
    console.log();
    console.log();

    testChar2("$");
    testChar2_2("#");
}();

async function testChar2(s) {
    await sleep(1);

    for (let i = 0; i < 20; i++) {
        process.stdout.write(s);
        await sleep(1);
    }
}

async function testChar2_2(s) {
    await sleep2(1);

    for (let i = 0; i < 20; i++) {
        process.stdout.write(s);
        await sleep2(1);
    }
}

