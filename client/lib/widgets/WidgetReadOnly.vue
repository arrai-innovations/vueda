<script setup>
import LinkModelView from "@vueda/components/LinkModelView.vue";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useResolvedLookupObject } from "@vueda/use/useResolvedLookupObject.js";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import omit from "lodash-es/omit.js";
import { computed, effectScope, inject, reactive, toRef, unref, watch } from "vue";

/**
 * Renders a field value as non-editable text, with optional prefix and suffix strings.
 * When `app` and `model` props are provided, the raw foreign-key value is resolved to a
 * human-readable name and rendered as a link to the related record's detail view.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...WIDGET_PROPS,
    /** Django app label used to resolve the foreign-key value to a display name and link. */
    app: {
        type: String,
        default: undefined,
    },
    /** Django model name used to resolve the foreign-key value to a display name and link. */
    model: {
        type: String,
        default: undefined,
    },
    /** Pre-fetched related object; used instead of a lookup when already available. */
    foreignKeyObj: {
        type: Object,
        default: undefined,
    },
    /** When true, shows a loading indicator instead of the resolved value. */
    loading: {
        type: Boolean,
        default: false,
    },
    /** Static text prepended to the displayed value. */
    prefix: {
        type: String,
        default: "",
    },
    /** Static text appended to the displayed value. */
    suffix: {
        type: String,
        default: "",
    },
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const es = effectScope();
const isLookupMode = computed(() => !!(props.app && props.model));
let modelConfig = null;
let fieldsList = null;
let expandList = null;
let resolvedLookupObject = null;
const resolvedReactive = reactive({
    object: {},
    error: null,
    errored: false,
    loading: undefined,
});

/**
 * @typedef {Object} State
 * @property {import('vue').ComputedRef<string>} pkKey
 * @property {boolean} keyAlreadyScoped
 */

/** @type {State} */
const state = reactive({
    pkKey: "id",
    keyAlreadyScoped: false,
});
watch(
    isLookupMode,
    (lookupMode) => {
        if (lookupMode) {
            modelConfig = es.run(() => useModelConfig(toRef(props, "app"), toRef(props, "model"), "list"));
            if (!state.keyAlreadyScoped) {
                state.pkKey = es.run(() => computed(() => modelConfig.info?.pk ?? "id"));
                state.keyAlreadyScoped = true;
            }
            fieldsList = es.run(() =>
                computed(() =>
                    !unref(isLookupMode)
                        ? []
                        : [
                              ...(props.modelFields?.length ? props.modelFields : modelConfig.config?.fetchFields),
                              "formatted_name",
                              state.pkKey,
                          ],
                ),
            );
            expandList = es.run(() =>
                computed(() =>
                    !unref(isLookupMode)
                        ? []
                        : (props.modelExpandFields?.length ? props.modelExpandFields : modelConfig.config?.expand) ||
                          [],
                ),
            );
            resolvedLookupObject = es.run(() =>
                useResolvedLookupObject(
                    toRef(props, "app"),
                    toRef(props, "model"),
                    toRef(widgetContext.state, "combinedValue"),
                    fieldsList,
                    expandList,
                ),
            );
            resolvedReactive.object = toRef(resolvedLookupObject, "object");
            resolvedReactive.error = toRef(resolvedLookupObject, "error");
            resolvedReactive.errored = toRef(resolvedLookupObject, "errored");
            resolvedReactive.loading = toRef(resolvedLookupObject, "loading");
        } else {
            resolvedReactive.object = null;
            resolvedReactive.error = null;
            resolvedReactive.errored = false;
            resolvedReactive.loading = false;
            if (state.keyAlreadyScoped) {
                state.pkKey?.effect?.stop?.();
                state.keyAlreadyScoped = false;
            }
            if (resolvedLookupObject) {
                resolvedLookupObject.effectScope.stop();
                resolvedLookupObject = null;
            }
            if (fieldsList) {
                // this is an unofficial way to stop computed properties
                fieldsList?.effect?.stop?.();
                fieldsList = null;
            }
            if (expandList) {
                // this is an unofficial way to stop computed properties
                expandList?.effect?.stop?.();
                expandList = null;
            }
            if (modelConfig) {
                modelConfig.effectScope.stop();
                modelConfig = null;
            }
        }
    },
    { immediate: true },
);
const theme = useWidgetTheme("WidgetReadOnly", props, widgetContext.state, {
    hidden: toRef(props, "hidden"),
});
const readonlyValue = computed(() => {
    if (props.loading || resolvedReactive.loading) {
        return "\u00A0";
    }
    return (
        props.foreignKeyObj?.formatted_name ??
        resolvedReactive.object?.formatted_name ??
        widgetContext.state.combinedValue
    );
});
const pkValue = computed(() => {
    return props.foreignKeyObj ? props.foreignKeyObj[state.pkKey] : resolvedReactive.object?.[state.pkKey];
});
const linkItemResolvedSlotNames = useSlotNameResolver(
    computed(() => [`widget-read-only(${widgetContext.state.formModelName})link-item`, "link-item"]),
);
const textItemResolvedSlotNames = useSlotNameResolver(
    computed(() => [`widget-read-only(${widgetContext.state.formModelName})text-item`, "text-item"]),
);
</script>

<template>
    <div :class="theme('root')" data-qa="widget-read-only-root">
        <div :class="theme('inner')" data-qa="widget-read-only-inner">
            <div
                v-bind="omit($attrs, ['class'])"
                :aria-labelledby="fieldContext?.state.fieldId"
                :class="[theme('value'), $attrs.class]"
                data-qa="widget-read-only-value"
            >
                <slot name="default" :value="readonlyValue || widgetContext.state.combinedValue">
                    <slot
                        v-if="isLookupMode && readonlyValue"
                        :app="app"
                        :class="theme('linkItem')"
                        :field-name="widgetContext.state.combinedName"
                        :form-model-name="widgetContext.state.formModelName"
                        :label="readonlyValue"
                        :model="model"
                        :name="linkItemResolvedSlotNames.name"
                        :pk="pkValue"
                        view="read"
                    >
                        <span v-if="prefix" :class="theme('linkItemPrefix')">{{ prefix }}</span>
                        <link-model-view
                            :app="app"
                            :class="theme('linkItem')"
                            :label="readonlyValue"
                            :model="model"
                            :pk="pkValue"
                            view="read"
                        />
                        <span v-if="suffix" :class="theme('linkItemSuffix')">{{ suffix }}</span>
                    </slot>
                    <slot
                        v-else
                        :class="theme('textItem')"
                        :field-name="widgetContext.state.combinedName"
                        :form-model-name="widgetContext.state.formModelName"
                        :name="textItemResolvedSlotNames.name"
                        :value="widgetContext.state.combinedValue"
                    >
                        <span v-if="prefix" :class="theme('textItemPrefix')">{{ prefix }}</span>
                        <span :class="theme('textItem')">
                            {{ widgetContext.state.combinedValue }}
                        </span>
                        <span v-if="suffix" :class="theme('textItemSuffix')">{{ suffix }}</span>
                    </slot>
                </slot>
            </div>
        </div>
    </div>
</template>
