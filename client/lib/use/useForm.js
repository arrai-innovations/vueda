import { assignReactiveObject, del } from "@arrai-innovations/reactive-helpers";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import get from "lodash-es/get.js";
import set from "lodash-es/set.js";
import { provide, reactive, readonly, toRef, watch } from "vue";

export default function useForm(props) {
    const state = reactive({
        values: {},
        errors: {},
        messages: {},
        dirty: {},
        anyDirty: false,
        doSubmit: undefined,
    });
    state.initialValues = toRef(() => props.initialValues);

    const updateFormValue = (name, value) => {
        if (name) {
            set(state.values, name, value);
        } else {
            throw new Error("No name provided to updateFormValue");
        }
    };
    const deleteFormValue = (name) => {
        if (name) {
            if (get(state.values, name) !== undefined) {
                del(state.values, name);
            }
        } else {
            throw new Error("No name provided to deleteFormValue");
        }
    };
    const updateError = (name, code, message) => {
        if (name && code && message) {
            set(state.errors, `${name}.${code}`, message);
        } else {
            throw new Error("No name or code or message provided to updateError");
        }
    };
    const deleteError = (name, code) => {
        if (name) {
            const key = code ? `${name}.${code}` : name;
            if (get(state.errors, key)) {
                del(state.errors, key);
            }
        } else {
            throw new Error("No name provided to deleteError");
        }
    };
    const updateMessage = (name, code, message) => {
        if (name && code && message) {
            set(state.messages, `${name}.${code}`, message);
        } else {
            throw new Error("No name or code or message provided to updateMessage");
        }
    };
    const deleteMessage = (name, code) => {
        if (name) {
            const key = code ? `${name}.${code}` : name;
            if (get(state.messages, key)) {
                del(state.messages, key);
            }
        } else {
            throw new Error("No name provided to deleteMessage");
        }
    };
    const setDirty = (name) => {
        if (name) {
            set(state.dirty, name, true);
            // only you can prevent over-reactivity
            if (!state.anyDirty) {
                state.anyDirty = true;
            }
        } else {
            throw new Error("No name provided to updateDirty");
        }
    };
    const clearDirty = (name) => {
        if (name) {
            del(state.dirty, name);
            state.anyDirty = Object.keys(state.dirty).length > 0;
        } else {
            throw new Error("No name provided to deleteDirty");
        }
    };
    const resetAllDirty = () => {
        assignReactiveObject(state.dirty, {});
        state.anyDirty = false;
    };
    const updateDoSubmit = (fn) => {
        state.doSubmit = fn;
    };

    watch(
        () => props.initialValues,
        (initialValues) => {
            if (initialValues) {
                state.values = cloneDeep(initialValues);
            }
        },
        {
            immediate: true,
            deep: true,
        },
    );
    const formContext = readonly({
        state,
        updateFormValue,
        deleteFormValue,
        updateError,
        deleteError,
        updateMessage,
        deleteMessage,
        setDirty,
        clearDirty,
        resetAllDirty,
        updateDoSubmit,
    });
    provide(FormContextSymbol, formContext);
    return formContext;
}
