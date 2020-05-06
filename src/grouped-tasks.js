/**
 * @typedef {Function} Resolve
 */

/**
 * @template T
 * @template S
 */
class GroupedTasks {

    /** @private
     *  @type Map<String, {entry: Object, resolve: Function}[]> */
    queue = new Map();

    /**
     * @param {GroupedTasks.Entry} entry
     * @return {Promise<S>}
     */
    getPromisedResult(entry) {
        return new Promise(resolve => {
            this.prepare(entry, resolve);
        });
    }

    /**
     * @param {GroupedTasks.Entry} entry
     * @param {Resolve} resolve
     * @private */
    prepare(entry, resolve) {
        if (!entry.needHandle()) {
            resolve(entry.getResult());
        } else {
            const entryId = entry.getId();
            if (!this.queue.has(entryId)) {
                this.queue.set(entryId, []);
                entry.delayStrategy(() => {
                    this.work({entry, resolve}, () => {return this.pullEntries(entryId)})
                        .then(/**/);
                });
            }
            this.queue.get(entryId).push({entry, resolve});
        }
    }

    pullEntries(entryId) {
        /** @type {{ entry: Object, resolve: Function}[]} */
        const array = this.queue.get(entryId);
        this.queue.delete(entryId);
        return array;
    }

    /** @abstract */
    async work({entry: firstEntry, resolve: firstResolve}, pullEntries) { }

    /** @abstract */
    static Entry = class {
        delayStrategy = GroupedTasks.delayWithMicroTask; // todo move to the outer class
        constructor(value) { // todo (key, value)
            this.value = value;
        }
        needHandle() {
            return true;
        }
        getValue() {
            return this.value;
        }

        getResult() {
            throw "Not implemented";
        }
        getId() { //todo rename "getKey" (GroupCriterion)
            throw "Not implemented";
        }
    }

    static now(callback) {
        callback();
    }
    static delayWithMicroTask(callback){ // Delay execution with micro task queue
        Promise.resolve().then(callback);
    }
    static delayWithEventLoop(callback){
        setImmediate ? setImmediate(callback) : setTimeout(callback, 0);
    }
    static delay(ms){
        return (callback) => setTimeout(callback, ms);
    }

}

module.exports = GroupedTasks;
