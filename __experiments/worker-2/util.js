console.log("[util-imported]");

export async function func1() {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log("(func1)");
    return "done-func1";
}

export async function func2() {
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log("(func2)");
    return "done-func2";
}

export default func2;