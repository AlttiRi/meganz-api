
/**
 * @mixin qweMixin
 */
const mixin = {
    aaa() {
        return this.q;
    },
    get sss() {
        return this.s;
    },
    get www() {
        return "www";
    }

};

/**
 * @mixes qweMixin
 */
class Qwe extends class {} {
    constructor() {
        super();

        // Case 1:
        // Only this way possible to add a getter that uses `this` + workable JSDoc
        Object.defineProperty(this, "aaa", { get: mixin.aaa });

        // Case 2:
        // Object.assign(this, mixin);
    }
    q = "q";
    s = "s";
}

const qwe = new Qwe();
// Case 1:
console.log(qwe.aaa);

// Case 2:
// console.log(qwe.aaa()); // q
// console.log(qwe.sss);   // undefined
// console.log(qwe.www);   // www