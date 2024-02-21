import { getFakeId } from "@arrai-innovations/reactive-helpers";
import { DateTime } from "luxon";
import { inject, provide, reactive, readonly } from "vue";

class ToastError extends Error {
    constructor(message) {
        super(message);
        this.name = "ToastError";
    }
}

/* usage:
    const toastDefinition = {
        message: "Your message to the user",
        variant: "error", // (error, info, success)
        dismissible: true,
        timestamp: new Date(), // optional
        autoDismiss: 0,
    };
*/

const ToastSymbol = Symbol("toast");

export default function useToast() {
    let toastState = inject(ToastSymbol, null);

    if (!toastState) {
        const internalState = reactive({
            toasts: [],
            toastDismissTimeouts: {},
        });

        const addToast = (toastDefinition) => {
            const id = getFakeId(internalState.toasts);
            const myToastDefinition = { ...toastDefinition, id };
            if (!myToastDefinition.timestamp) {
                myToastDefinition.timestamp = DateTime.now().toISO();
            }
            internalState.toasts.push(myToastDefinition);
            if (myToastDefinition.autoDismiss) {
                internalState.toastDismissTimeouts[id] = setTimeout(() => {
                    removeToast(id);
                }, myToastDefinition.autoDismiss);
            }
            return id;
        };

        const removeToast = (toastId) => {
            const index = internalState.toasts.findIndex((toast) => toast.id === toastId);
            if (index === -1) {
                throw new ToastError(`No toast with id ${toastId} found`);
            }
            if (internalState.toastDismissTimeouts[toastId]) {
                clearTimeout(internalState.toastDismissTimeouts[toastId]);
                delete internalState.toastDismissTimeouts[toastId];
            }
            internalState.toasts.splice(index, 1);
        };

        toastState = {
            state: readonly(internalState),
            addToast,
            removeToast,
        };
        provide(ToastSymbol, toastState);
    }

    return toastState;
}
