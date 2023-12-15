import { getFakeId } from "@arrai-innovations/reactive-helpers";
import { DateTime } from "luxon";
import { reactive, readonly } from "vue";

class ToastError extends Error {
    constructor(message) {
        super(message);
        this.name = "ToastError";
    }
}

const toastsState = reactive({
    toasts: [],
    toastDismissTimeouts: {},
});

const readOnlyToastsState = readonly(toastsState);

/* usage:
    const toastDefinition = {
        message: "Your message to the user",
        variant: "error", // (error, info, success)
        dismissible: true,
        timestamp: new Date(), // optional
        autoDismiss: 0,
    };
*/
const addToast = (toastDefinition) => {
    const id = getFakeId(toastsState.toasts);
    const myToastDefinition = { ...toastDefinition, id };
    if (!myToastDefinition.timestamp) {
        myToastDefinition.timestamp = DateTime.now().toISO();
    }
    toastsState.toasts.push(myToastDefinition);
    if (myToastDefinition.autoDismiss) {
        toastsState.toastDismissTimeouts[id] = setTimeout(() => {
            removeToast(id);
        }, myToastDefinition.autoDismiss);
    }
    return id;
};

const removeToast = (toastId) => {
    const index = toastsState.toasts.findIndex((toast) => toast.id === toastId);
    if (index === -1) {
        throw new ToastError(`No toast with id ${toastId} found`);
    }
    if (toastsState.toastDismissTimeouts[toastId]) {
        clearTimeout(toastsState.toastDismissTimeouts[toastId]);
        delete toastsState.toastDismissTimeouts[toastId];
    }
    toastsState.toasts.splice(index, 1);
};

export default function useToasts() {
    return {
        state: readOnlyToastsState,
        addToast,
        removeToast,
    };
}
