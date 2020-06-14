!async function demo() {

    function log(n) {
        console.log(n + " log");
        return n;
    }

    for (let i = 0; i < 5; i++) {
        console.log(i + "A");
        Promise.resolve(log(i))
            .then(i => {
                console.log(i + "_");
                return i;
            })
            .then(i => console.log(i + "__"));
        console.log(i + "B");
    }
    console.log();


    function* messageGenerator() {
        yield Promise.resolve("A");
        yield Promise.resolve("B");
        yield Promise.resolve("C");
        yield Promise.resolve("D");
    }
    // or (works only with `for await`)
    async function* messageGenerator2() {
        yield "A";
        yield "B";
        yield "C";
        yield "D";
    }

    Promise.resolve(log("Av4"))
        .then(message => {console.log(message); return log("Bv4")})
        .then(message => {console.log(message); return log("Cv4")})
        .then(message => {console.log(message); return log("Dv4")})
        .then(message => {console.log(message);});
    console.log();


    for (const messagePromise of messageGenerator()) {
        await messagePromise.then(message => console.log(message + "v1"));
        // or
        // messagePromise.then(message => console.log(message + "v1"));
    }
    // or
    // try to comment it
    for await (const message of messageGenerator()) {
        console.log(message + "v2");
    }

    for await (const message of messageGenerator2()) {
        console.log(message + "v2");
    }


    Promise.resolve(log("Av3"))
        .then(message => {console.log(message); return log("Bv3")})
        .then(message => {console.log(message); return log("Cv3")})
        .then(message => {console.log(message); return log("Dv3")})
        .then(message => {console.log(message);});

}();