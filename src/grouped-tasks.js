/**
 * @typedef {Function} Resolve
 */

/** @template K, V, R */
class SimpleEntry {
    /** @type {function(Resolve): void} */
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

    /** @return {K} */
    getKey() {
        return this.key;
    }

    /** @return {V} */
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

/** @template K, V, R */
class EntriesHolder {
    /** @type {K} */
    key;
    /** @type {SimpleEntry<K, V, R>} */
    first;

    /**
     * @param {K} entryKey
     * @param {SimpleEntry<K, V, R>} firstEntry
     * @param {GroupedTasks<K, V, R>} groupedTasks
     */
    constructor(entryKey, firstEntry, groupedTasks) {
        this.key = entryKey;
        this.first = firstEntry;
        this.groupedTasks = groupedTasks;
    }

    /** @return {SimpleEntry<K, V, R>[]} */
    pull() {
        return this.groupedTasks.pullEntries(this.key);
    }

    /**
     * If passed `0` - no splitting
     * @param count
     * @return {Generator<SimpleEntry<K, V, R>[]>}
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
     * @param {SimpleEntry<K, V, R>} entryClass
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

    /**
     * @type Map<K, SimpleEntry<K, V, R>[]>
     * @private
     */
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

    /**
     * @param {SimpleEntry<K, V, R>} entry
     * @private
     */
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
     * @return {SimpleEntry<K, V, R>[]}
     */
    pullEntries(key) {
        const array = this.queue.get(key);
        this.queue.delete(key);
        return array;
    }

    /**
     * @param {K} key
     * @param {Number} count
     * @return {Generator<SimpleEntry<K, V, R>[]>}
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
     * @param {EntriesHolder<K, V, R>} entriesHolder
     * @return {Promise<void>}
     */
    async handle(entriesHolder) {}

    /** Contains methods to delay the execution of the passed callback */
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
        static afterDelay(executable, ms = 0){
            setTimeout(executable, ms);
        }
    }
}

module.exports = GroupedTasks;
