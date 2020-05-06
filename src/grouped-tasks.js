/**
 * @typedef {Function} Resolve
 */

/**
 * @template K, V, R
 */
class SimpleEntry {
    /** @type {function(R): void} */
    resolve;

    /**
     * @param {K} key - group criterion
     * @param {V} value
     * @param {Resolve} resolve
     */
    constructor(key, value, resolve) {
        this.key     = key;
        this.value   = value;
        this.resolve = resolve;
    }

    /**
     * @return {K}
     */
    getKey() {
        return this.key;
    }

    /**
     * @return {V}
     */
    getValue() {
        return this.value;
    }

    /**
     * Override if you implement `getResult()`
     * @default
     * @return {boolean}
     */
    needHandle() {
        return true;
    }

    /**
     * @abstract
     * @return {R}
     */
    getResult() {
        throw "SimpleEntry.getResult() method does not implemented";
    }
}

/**
 * @template K, V, R
 * @abstract
 */
class GroupedTasks {

    /**
     * @param {SimpleEntry} entryClass
     * @param {Function} delayStrategy
     */
    constructor({entryClass, delayStrategy} = {}) {
        this.entryClass = entryClass || GroupedTasks.SimpleEntry;
        this.delayStrategy = delayStrategy || GroupedTasks.execute.afterDelayWithMicroTask;
    }

    /**
     * @type {Class<SimpleEntry<K, V, R>>}
     */
    static SimpleEntry = SimpleEntry;

    /** @private
     *  @type Map<K, SimpleEntry[]> */
    queue = new Map();

    /**
     * @param {Object} init
     * @param {K?} init.key
     * @param {V?} init.value
     * @return {Promise<R>}
     */
    getResult({key, value}) {
        return new Promise(resolve => {
            const entry = new this.entryClass(key, value, resolve);
            if (entry.needHandle()) {
                this.enqueue(entry);
            } else {
                resolve(entry.getResult());
            }
        });
    }

    /** @param {SimpleEntry} entry
     *  @private */
    enqueue(entry) {
        const entryKey = entry.getKey();
        if (!this.queue.has(entryKey)) {
            this.queue.set(entryKey, []);
            this.delayStrategy(() => {
                this.handle({
                        firstEntry: entry,
                        pullEntries: () => {
                            return this.pullEntries(entryKey);
                        }
                    })
                    .then(/*ignore promise*/);
            });
        }
        this.queue.get(entryKey).push(entry);
    }

    /**
     * @param {K} key
     * @return {SimpleEntry[]}
     */
    pullEntries(key) {
        const array = this.queue.get(key);
        this.queue.delete(key);
        return array;
    }

    /**
     * @abstract
     * @param {Object} init
     * @param {SimpleEntry} init.firstEntry
     * @param {function(): SimpleEntry[]} init.pullEntries
     * @return {Promise<void>}
     */
    async handle({firstEntry, pullEntries}) {}

    static execute = class {
        static now(executable) {
            executable();
        }
        static afterDelayWithMicroTask(executable){ // Delay execution with micro task queue
            Promise.resolve().then(executable);
        }
        static afterDelayWithEventLoop(executable){
            setImmediate ? setImmediate(executable) : setTimeout(executable, 0);
        }
        static afterDelay(ms){
            return executable => setTimeout(executable, ms);
        }
    }
}

module.exports = GroupedTasks;
