import { assignReactiveObject, del } from "@arrai-innovations/reactive-helpers";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import get from "lodash-es/get.js";
import set from "lodash-es/set.js";
import { provide, reactive, readonly, ref, toRef, watch } from "vue";

export default function useForm(props) {
    const values = reactive({});
    const errors = reactive({});
    const messages = reactive({});
    const dirty = reactive({});
    const anyDirty = ref(false);
    const doSubmit = ref(undefined);
    const focused = ref(undefined);
    const initialValues = toRef(() => props.initialValues);

    const reset = () => {
        assignReactiveObject(values, initialValues.value);
        assignReactiveObject(errors, {});
        assignReactiveObject(messages, {});
        assignReactiveObject(dirty, {});
        anyDirty.value = false;
    };
    const clearServerError = (name) => {
        if (name) {
            if (get(errors, `${name}.server`)) {
                del(errors, `${name}.server`);
            }
        } else {
            throw new Error("No name provided to clearServerError");
        }
    };
    const updateValue = (name, value) => {
        if (name) {
            set(values, name, value);
        } else {
            throw new Error("No name provided to updateValue");
        }
    };
    const deleteValue = (name) => {
        if (name) {
            if (get(values, name) !== undefined) {
                del(values, name);
            }
        } else {
            throw new Error("No name provided to deleteValue");
        }
    };
    const focus = (name) => {
        focused.value = name;
    };
    const blur = (name) => {
        focused.value = name;
        clearServerError(name);
    };
    const updateError = (name, code, message) => {
        if (name && code && message) {
            set(errors, `${name}.${code}`, message);
        } else {
            throw new Error("No name or code or message provided to updateError");
        }
    };
    const deleteError = (name, code) => {
        if (name) {
            const key = code ? `${name}.${code}` : name;
            if (get(errors, key)) {
                del(errors, key);
            }
        } else {
            throw new Error("No name provided to deleteError");
        }
    };
    const updateMessage = (name, code, message) => {
        if (name && code && message) {
            set(messages, `${name}.${code}`, message);
        } else {
            throw new Error("No name or code or message provided to updateMessage");
        }
    };
    const deleteMessage = (name, code) => {
        if (name) {
            const key = code ? `${name}.${code}` : name;
            if (get(messages, key)) {
                del(messages, key);
            }
        } else {
            throw new Error("No name provided to deleteMessage");
        }
    };
    const setDirty = (name) => {
        if (name) {
            set(dirty, name, true);
            // only you can prevent over-reactivity
            if (!anyDirty.value) {
                anyDirty.value = true;
            }
        } else {
            throw new Error("No name provided to updateDirty");
        }
    };
    const clearDirty = (name) => {
        if (name) {
            del(dirty, name);
            anyDirty.value = Object.keys(dirty).length > 0;
        } else {
            throw new Error("No name provided to deleteDirty");
        }
    };
    const resetAllDirty = () => {
        assignReactiveObject(dirty, {});
        anyDirty.value = false;
    };
    const updateDoSubmit = (fn) => {
        doSubmit.value = fn;
    };
    /**
     * handleServerFormValidationError - take django form validation messages from a
     *  FormValidationError and put them in the form context as errors
     * @param {FormValidationError} error - the error to handle
     */
    const handleServerFormValidationError = (error) => {
        const messages = error.messages;
        for (const [name, message] of Object.entries(messages)) {
            updateError(name, "server", message);
        }
    };
    watch(
        () => props.initialValues,
        (initialValues) => {
            if (initialValues) {
                assignReactiveObject(values, cloneDeep(initialValues));
            }
        },
        {
            immediate: true,
            deep: true,
        },
    );
    const formContext = readonly({
        values,
        errors,
        messages,
        dirty,
        anyDirty,
        doSubmit,
        initialValues,
        focused,
        reset,
        updateValue,
        deleteValue,
        updateError,
        deleteError,
        updateMessage,
        deleteMessage,
        setDirty,
        clearDirty,
        resetAllDirty,
        updateDoSubmit,
        handleServerFormValidationError,
        focus,
        blur,
    });
    provide(FormContextSymbol, formContext);
    return formContext;
}
