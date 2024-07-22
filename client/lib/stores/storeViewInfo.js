import { defineStore } from "pinia";

/**
 * A Pinia store for managing view information, specifically for detail and bulk views.
 * This store allows adding, tracking, and checking views that are either in detail or bulk mode.
 *
 * @store
 * @name storeViewInfo
 * @id viewInfo
 *
 * State:
 * - detail: An array to hold detail views.
 * - bulk: An array to hold bulk views.
 *
 * Actions:
 * - addDetail(view): Adds a view to the detail array if it's not already included.
 *   @param {string} view - The name of the detail view to add.
 * - addBulk(view): Adds a view to the bulk array if it's not already included.
 *   @param {string} view - The name of the bulk view to add.
 * - isDetailView(view): Checks if a given view is in the detail array.
 *   @param {string} view - The name of the view to check.
 *   @returns {boolean} True if the view is in the detail array, false otherwise.
 * - isBulkView(view): Checks if a given view is in the bulk array.
 *   @param {string} view - The name of the view to check.
 *   @returns {boolean} True if the view is in the bulk array, false otherwise.
 */
export const storeViewInfo = defineStore({
    id: "viewInfo",
    state: () => ({
        detail: [],
        bulk: [],
    }),
    actions: {
        addDetail(view) {
            if (!this.detail.includes(view)) {
                this.detail.push(view);
            }
        },
        addBulk(view) {
            if (!this.bulk.includes(view)) {
                this.bulk.push(view);
            }
        },
        isDetailView(view) {
            return this.detail.includes(view);
        },
        isBulkView(view) {
            return this.bulk.includes(view);
        },
    },
});
