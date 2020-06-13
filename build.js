import progress from "./src/examples/promise-progress.js";
import * as bundles from "./building/bundles.js";


async function build() {
    const es = Promise.all([
        // The bundle without dependencies. Note: it does NOT contain the dependency `import`s
        bundles.esPure(),

        // Only dependencies, it is needed only for the next operations
        bundles.esDependencies(),
    ]);
    // ----------------------------------------
    const browser = Promise.all([
        // Create the bundle that requires CryptoJS (the bundle uses CryptoJS from the browser context)
        bundles.browserPure(),

        // Create the bundle of CryptoES, only the needed functional (cut version)
        bundles.browserCryptoES(),
    ]);
    // ----------------------------------------
    await es;
    const standalone = Promise.all([
        // I don't think that this bundle is needed
        // bundles.esStandalone(),

        // Just the standalone browser bundle (Note: CryptoES code is minified in the non minified bundle)
        bundles.browserStandalone()
    ]);
    // ----------------------------------------
    await Promise.all([browser, standalone]);
}

!async function main() {
    console.time("Build");
    await progress(build(), "Building...");
    console.timeEnd("Build");
}();