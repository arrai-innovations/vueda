import { getFakeId } from "@arrai-innovations/reactive-helpers";
import { DateTime } from "luxon";
import { defineStore } from "pinia";

class ToastError extends Error {
    constructor(message) {
        super(message);
        this.name = "ToastError";
    }
}

export default defineStore({
    id: "storeToast",
    state: () => ({
        toasts: [],
        toastDismissTimeouts: {},
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
        },
    },
});
