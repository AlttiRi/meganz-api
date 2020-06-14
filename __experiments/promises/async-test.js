// Adding `async` to a function does not remove it from the execution thread
// So I think it better to add `async` word to every function that returns a promise for clarifying
// even when it does not use `await`

test1(); // or
//test2();
console.log("-----");


async function test1() {
    for (let i = 0; i < 3; i++) {
        console.log("t1");
        console.log(one());
    }
}

async function test2() {
    for (let i = 0; i < 3; i++) {
        console.log("t2");
        console.log(await one());
    }
}

async function one() {
    console.log("one");
    return two();
}

async function two() {
    console.log("two");
    return new Promise(resolve => setTimeout(_ => {
        console.log("three");
        resolve("-");
    }, 500));
}


// test1();

// t1
// one
// two
// Promise { <pending> }
// t1
// one
// two
// Promise { <pending> }
// t1
// one
// two
// Promise { <pending> }
// -----
// three
// three
// three


// test2();

// t2
// one
// two
// -----
// three
// -
// t2
// one
// two
// three
// -
// t2
// one
// two
// three
// -