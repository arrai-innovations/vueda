<script setup>
import { storeModelChoices } from "@vueda/stores/storeModelChoices.js";
import { storeUser } from "@vueda/stores/storeUser.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { AuthScopeInvalidatedError } from "@vueda/utils/errors.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import WidgetReadOnly from "@vueda/widgets/WidgetReadOnly.vue";
import omit from "lodash-es/omit.js";
import { computed, inject, ref, unref, useAttrs, watch } from "vue";

/**
 * Read-only presentation for a `SlugRelatedField`, which edits with {@link WidgetModel}. The
 * `SlugRelatedField` type mapping selects it as the field's read-only widget. Wraps
 * {@link WidgetReadOnly}, so the row keeps its label association and theme slots.
 *
 * The label comes from the same choices endpoint that supplies the options of `WidgetModel`, so it
 * matches the label that `WidgetModel` shows for the same value. The related model needs no
 * viewset, and the value can be any key that the choices endpoint uses, such as a `slug_field`.
 * The value is not shown as a link.
 *
 * When the field's complete option list is already loaded, the label comes from that list.
 * Otherwise `storeModelChoices.fetchChoiceLabels` fetches it. That request is shared with other
 * widgets that show values of the same field. A label that the store already holds shows while
 * the request runs. A value with no matching option shows the raw value.
 *
 * The form passes `fieldApp`, `fieldModel`, and `fieldName` only for a field with `choices: true`.
 * A field that the server marks read-only has no choices, and neither does a field that sends
 * `displayChoices`. Without the three props, this widget passes every prop to `WidgetReadOnly`
 * unchanged, so such a field renders as it does with `WidgetReadOnly`.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    /** Django app label for the model whose choices supply the label. */
    fieldApp: {
        type: String,
        default: undefined,
    },
    /** Django model name used to resolve the choices endpoint. */
    fieldModel: {
        type: String,
        default: undefined,
    },
    /** Field name on the model whose choices supply the label. */
    fieldName: {
        type: String,
        default: undefined,
    },
    /**
     * Read the value from `modelValue` even inside a field, as every widget does with this prop.
     * The prop is passed on to `WidgetReadOnly`.
     */
    contextless: {
        type: Boolean,
        default: false,
    },
    /** The value to show. A many-related field passes an array, and its labels are joined. */
    modelValue: {
        // the same types as WIDGET_PROPS, so the fallback accepts what WidgetReadOnly accepts
        type: [String, Number, Boolean, Array, Object],
        default: undefined,
    },
});
const attrs = useAttrs();
// The inner WidgetReadOnly sets up the widget context. This widget only reads the value, the same
// way that context does: from the field when there is one and the widget is not contextless,
// otherwise from `modelValue`.
/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const modelChoicesStore = storeModelChoices();
const userStore = storeUser();
const isActive = useIsActive();
const loading = ref(false);
const hasChoicesEndpoint = computed(() => !!(props.fieldApp && props.fieldModel && props.fieldName));

const values = computed(() => {
    const fc = props.contextless ? null : unref(fieldContext);
    const value = fc ? fc.state.value : props.modelValue;
    return (Array.isArray(value) ? value : [value])
        .filter((item) => item !== null && item !== undefined && item !== "")
        .map((item) => String(item));
});
// `undefined` means that the store does not know the label yet, and `null` that no option matches.
const storedLabels = computed(() =>
    values.value.map((value) => ({
        value,
        label: modelChoicesStore.getChoiceLabel(props.fieldApp, props.fieldModel, props.fieldName, value),
    })),
);
// Every value gets an option, so a value without a label shows as itself, and the values of a
// many-related field join with commas even when no label is known.
const options = computed(() => storedLabels.value.map(({ value, label }) => ({ value, label: label ?? value })));
// A refresh keeps showing what the store already knows, so only a value with an unknown label waits
// for the request.
const showLoading = computed(() => loading.value && storedLabels.value.some(({ label }) => label === undefined));

let latestRequest = 0;
watch(
    [
        () => props.fieldApp,
        () => props.fieldModel,
        () => props.fieldName,
        () => values.value.join("\u0000"),
        // the store drops its labels when the authenticated user changes, so fetch under the new one
        () => userStore.identityGeneration,
        // a view that KeepAlive caches fetches when it is shown again, not while it is hidden
        isActive,
    ],
    async () => {
        if (!isActive.value || !hasChoicesEndpoint.value) {
            return;
        }
        const request = ++latestRequest;
        if (!values.value.length) {
            loading.value = false;
            return;
        }
        loading.value = true;
        try {
            await modelChoicesStore.fetchChoiceLabels(props.fieldApp, props.fieldModel, props.fieldName, values.value);
        } catch (e) {
            // an AuthScopeInvalidatedError means the authenticated user changed mid-fetch; the watch
            // fetches again under the new user
            if (!(e instanceof AuthScopeInvalidatedError)) {
                console.error("[WidgetModelReadOnly] Failed to fetch choice labels:", e);
            }
        } finally {
            if (request === latestRequest) {
                loading.value = false;
            }
        }
    },
    { immediate: true },
);

// `buildForm` passes the related model as `app` and `model`, which would put `WidgetReadOnly` in
// lookup mode. A field's `widgetProps` override applies on read views too, and the `WidgetModel`
// props that it may set (`type`, `isFilter`, `editable`) mean nothing here.
const childAttrs = computed(() => omit(attrs, ["app", "model", "type", "isFilter", "editable"]));
</script>

<template>
    <!-- The option keys come after childAttrs, so an edit widget's optionLabel or optionValue cannot
         redirect WidgetReadOnly away from the options built here. -->
    <widget-read-only
        v-if="hasChoicesEndpoint"
        v-bind="childAttrs"
        :contextless="contextless"
        :loading="showLoading"
        :model-value="modelValue"
        option-label="label"
        option-value="value"
        :options="options"
    >
        <template v-for="slotName in Object.keys($slots)" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps || {}" />
        </template>
    </widget-read-only>
    <widget-read-only v-else v-bind="attrs" :contextless="contextless" :model-value="modelValue">
        <template v-for="slotName in Object.keys($slots)" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps || {}" />
        </template>
    </widget-read-only>
</template>
