<script setup>
import { reactive, readonly, watch } from "vue";
import { del } from "@arrai-innovations/reactive-helpers";
import cloneDeep from "lodash-es/cloneDeep.js";
import set from "lodash-es/set.js";
import get from "lodash-es/get.js";

const props = defineProps({
    initialValues: Object,
});
defineEmits(["submit"]);
const form = reactive({
    values: {},
    errors: {},
    messages: {},
    initialValues: {},
    dirty: {},
});
const handleSubmit = () => {
    emit("submit", {
        form: readOnlyForm,
        updateFormValue,
        deleteFormValue,
        updateError,
        deleteError,
        updateMessage,
        deleteMessage,
    });
};

const updateFormValue = (name, value) => {
    set(form.values, name, value);
};
const deleteFormValue = (name) => {
    if (name && get(form.values, name)) {
        del(form.values, name);
    }
};
const updateError = (name, code, message) => {
    if (name && code && message) {
        set(form.errors, `${name}.${code}`, message);
    }
};
const deleteError = (name, code) => {
    if (name) {
        const key = code ? `${name}.${code}` : name;
        if (get(form.errors, key)) {
            del(form.errors, key);
        }
    }
};
const updateMessage = (name, code, message) => {
    if (name && code && message) {
        set(form.messages, `${name}.${code}`, message);
    }
};
const deleteMessage = (name, code) => {
    if (name) {
        const key = code ? `${name}.${code}` : name;
        if (get(form.messages, key)) {
            del(form.messages, key);
        }
    }
};
const updateDirty = (name, value) => {
    set(form.dirty, name, value);
};
const deleteDirty = (name) => {
    del(form.dirty, name);
};
const readOnlyForm = readonly({
    form,
});
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
    form: readOnlyForm,
    updateFormValue,
    deleteFormValue,
    updateError,
    deleteError,
    updateMessage,
    deleteMessage,
    updateDirty,
    deleteDirty,
});
defineExpose(formContext);
provide("formContext", formContext);
</script>

<template>
    <form @submit.prevent="handleSubmit" novalidate>
        <slot v-bind="formContext"></slot>
    </form>
</template>
