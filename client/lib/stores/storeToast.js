import { getFakeId } from "@arrai-innovations/reactive-helpers";
import { DateTime } from "luxon";
import { defineStore } from "pinia";

class ToastError extends Error {
    constructor(message) {
        super(message);
        this.name = "ToastError";
    }
}

/**
 * storeToast - pinia store for toast state
 * Usage:
 * ```js
 *  import { storeToast } from "vueda-client";
 *  const toast = storeToast();
 *
 *  toast.toasts; // reactive array of toasts
 *  toast.toastDismissTimeouts; // reactive object of toast dismiss timeouts
 *
 *  toast.addToast({message: "message", autoDismiss: 5000}); // add a toast
 *  toast.removeToast(id); // remove a toast
 *
 *  developers using storeToast in their component may add more properties for features they support.
 *   *  example toast definition, for properties used in the store:
 *  {
 *    id: "id", // optional, will be generated if not provided, must be unique
 *    timestamp: DateTime.now().toISO(), // example would be "2021-08-01T12:00:00.000-04:00"
 *    autoDismiss: 5000, // auto dismiss in milliseconds, or falsey for no auto dismiss
 *    autoDismissProgress: 0, // updated by the store to show progress of auto dismiss
 *  };
 */
export default defineStore({
    id: "storeToast",
    state: () => ({
        toasts: [],
        toastDismissTimeouts: {},
        progressInterval: null,
    }),
    actions: {
        addToast(toastDefinition) {
            const id = getFakeId(this.toasts);
            const myToastDefinition = { ...toastDefinition, id };
            if (!myToastDefinition.timestamp) {
                myToastDefinition.timestamp = DateTime.now().toISO();
            }
            this.toasts.push(myToastDefinition);
            if (myToastDefinition.autoDismiss) {
                this.toastDismissTimeouts[id] = setTimeout(() => {
                    this.removeToast(id);
                }, myToastDefinition.autoDismiss);
            }
            if (!this.progressInterval) {
                this.progressInterval = setInterval(() => {
                    this.toasts.forEach((toast) => {
                        if (toast.autoDismiss) {
                            const timeElapsed = DateTime.now()
                                .diff(DateTime.fromISO(toast.timestamp))
                                .as("milliseconds");
                            toast.autoDismissProgress = (timeElapsed / toast.autoDismiss) * 100;
                        }
                    });
                }, 100);
            }
            return id;
        },
        removeToast(toastId) {
            const index = this.toasts.findIndex((toast) => toast.id === toastId);
            if (index === -1) {
                throw new ToastError(`No toast with id ${toastId} found`);
            }
            if (this.toastDismissTimeouts[toastId]) {
                clearTimeout(this.toastDismissTimeouts[toastId]);
                delete this.toastDismissTimeouts[toastId];
            }
            this.toasts.splice(index, 1);
            if (this.toasts.length === 0) {
                clearInterval(this.progressInterval);
                this.progressInterval = null;
            }
        },
    },
});
