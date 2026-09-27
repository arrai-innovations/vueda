/**
 * @module fixtureStore
 */

/**
 * Stands in for Pinia's defineStore; the plugin recognizes the call by name.
 *
 * @param {string} id - The store id.
 * @param {object} options - The store options.
 * @returns {Function} The store definition.
 */
function defineStore(id, options) {
    return () => options;
}

/**
 * Reset the count to zero.
 *
 * @this {{count: number}}
 * @returns {void}
 */
function reset() {
    this.count = 0;
}

/**
 * A fixture store.
 */
export const storeFixture = defineStore("fixture", {
    state: () => ({
        /**
         * How many times `increment` ran.
         *
         * @type {number}
         */
        count: 0,
    }),
    getters: {
        /**
         * Twice the count.
         *
         * @param {{count: number}} state - The store state.
         * @returns {number} The doubled count.
         */
        doubled: (state) => state.count * 2,
    },
    actions: {
        /**
         * Add `step` to the count.
         *
         * @param {number} [step] - How much to add.
         */
        increment(step = 1) {
            this.count += step;
        },
        reset,
    },
});
