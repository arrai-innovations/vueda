import { del } from "@arrai-innovations/reactive-helpers";
import { FormContextSymbol } from "@vueda/utils/index.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import get from "lodash-es/get.js";
import set from "lodash-es/set.js";
import { provide, reactive, readonly, toRef, watch } from "vue";

export default function useForm(props) {
    const form = reactive({
        values: {},
        errors: {},
        messages: {},
        dirty: {},
        doSubmit: undefined,
    });
    form.initialValues = toRef(() => props.initialValues);

    const updateFormValue = (name, value) => {
        if (name) {
            set(form.values, name, value);
        } else {
            throw new Error("No name provided to updateFormValue");
        }
    };
    const deleteFormValue = (name) => {
        if (name) {
            if (get(form.values, name) !== undefined) {
                del(form.values, name);
            }
        } else {
            throw new Error("No name provided to deleteFormValue");
        }
    };
    const updateError = (name, code, message) => {
        if (name && code && message) {
            set(form.errors, `${name}.${code}`, message);
        } else {
            throw new Error("No name or code or message provided to updateError");
        }
    };
    const deleteError = (name, code) => {
        if (name) {
            const key = code ? `${name}.${code}` : name;
            if (get(form.errors, key)) {
                del(form.errors, key);
            }
        } else {
            throw new Error("No name provided to deleteError");
        }
    };
    const updateMessage = (name, code, message) => {
        if (name && code && message) {
            set(form.messages, `${name}.${code}`, message);
        } else {
            throw new Error("No name or code or message provided to updateMessage");
        }
    };
    const deleteMessage = (name, code) => {
        if (name) {
            const key = code ? `${name}.${code}` : name;
            if (get(form.messages, key)) {
                del(form.messages, key);
            }
        } else {
            throw new Error("No name provided to deleteMessage");
        }
    };
    const updateDirty = (name, value) => {
        if (name) {
            set(form.dirty, name, value);
        } else {
            throw new Error("No name provided to updateDirty");
        }
    };
    const deleteDirty = (name) => {
        if (name) {
            del(form.dirty, name);
        } else {
            throw new Error("No name provided to deleteDirty");
        }
    };
    const updateDoSubmit = (fn) => {
        form.doSubmit = fn;
    };

    watch(
        () => props.initialValues,
        (initialValues) => {
            if (initialValues) {
                form.values = cloneDeep(initialValues);
            }
        },
        {
            immediate: true,
            deep: true,
        },
    );
    const formContext = readonly({
        form,
        updateFormValue,
        deleteFormValue,
        updateError,
        deleteError,
        updateMessage,
        deleteMessage,
        updateDirty,
        deleteDirty,
        updateDoSubmit,
    });
    provide(FormContextSymbol, formContext);
    return formContext;
}
