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

/** @template K */
class EntriesHolder {
    /** @type {K} */
    key;
    /** @type {SimpleEntry} */
    first;

    /**
     * @param {K} entryKey
     * @param {SimpleEntry} firstEntry
     * @param {GroupedTasks} groupedTasks
     */
    constructor(entryKey, firstEntry, groupedTasks) {
        this.key = entryKey;
        this.first = firstEntry;
        this.groupedTasks = groupedTasks;
    }

    /** @return {SimpleEntry[]} */
    pull() {
        return this.groupedTasks.pullEntries(this.key);
    }

    /**
     * If passed `0` - no splitting
     * @param count
     * @return {Generator<SimpleEntry[]>}
     */
    parts(count) {
        return this.groupedTasks.pullParts(this.key, count);
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
     *  @private  */
    enqueue(entry) {
        const entryKey = entry.getKey();
        if (!this.queue.has(entryKey)) {
            this.queue.set(entryKey, []);
            this.delayStrategy(() => {
                this.handle(new EntriesHolder(entryKey, entry, this))
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
     * @param {K} key
     * @param {Number} count
     * @return {Generator<SimpleEntry[]>}
     */
    *pullParts(key, count) {
        const array = this.pullEntries(key);

        if (!count) {
            yield array;
        } else {
            let pos = 0;
            while (pos < array.length) {
                yield array.slice(pos, pos + count);
                pos += count;
            }
        }
    }

    /**
     * @abstract
     * @param {EntriesHolder} entriesHolder
     * @return {Promise<void>}
     */
    async handle(entriesHolder) {}

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
