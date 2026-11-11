<script setup>
import LinkModelView from "@vueda/navigation/link-model-view/LinkModelView.vue";
import "@vueda/theme/vueda-tailwind/widgets/WidgetReadOnly.theme.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useResolvedLookupObject } from "@vueda/use/useResolvedLookupObject.js";
import { useResolvedLookupObjects } from "@vueda/use/useResolvedLookupObjects.js";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { choiceDisplay } from "@vueda/utils/choiceLabels.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import omit from "lodash-es/omit.js";
import { computed, effectScope, inject, reactive, shallowRef, toRef, unref, watch } from "vue";

/**
 * Renders a field value as non-editable text, with optional prefix and suffix strings.
 *
 * When `app` and `model` props are provided, the widget is in lookup mode. A foreign-key value is
 * resolved to the related object's `formatted_name`, which links to that object's read view through
 * {@link LinkModelView}. An array value, such as a many-to-many field's value, shows one label for
 * each related object, separated by commas. Each label links by the same rule. The prefix and suffix
 * wrap the whole list.
 *
 * An array of objects is an expanded value, and each label is the object's `formatted_name` with
 * no request. An array of primary keys resolves all its objects in one request. A key that the
 * server does not return shows as plain text. An empty array shows the same empty value as an
 * empty foreign key.
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
    /** Static choice options used to resolve stored values to display labels. */
    options: {
        type: [Array, Boolean],
        default: false,
    },
    /** Key on each option object used as the displayed label. */
    optionLabel: {
        type: String,
        default: "label",
    },
    /** Key on each option object used as the stored value. */
    optionValue: {
        type: String,
        default: "value",
    },
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const es = effectScope();
const isLookupMode = computed(() => !!(props.app && props.model));
const isManyValue = computed(() => Array.isArray(widgetContext.state.combinedValue));
// An expanded to-many value holds an object for each related row. An unexpanded one holds a primary key for each.
const isExpandedManyValue = computed(
    () =>
        isManyValue.value &&
        widgetContext.state.combinedValue.every((related) => related !== null && typeof related === "object"),
);
// The single-object lookup resolves a scalar value; the many-object lookup resolves an array of primary keys.
const lookupPk = computed(() => (isManyValue.value ? undefined : widgetContext.state.combinedValue));
const lookupPks = computed(() =>
    isManyValue.value && !isExpandedManyValue.value ? widgetContext.state.combinedValue : [],
);
let modelConfig = null;
let fieldsList = null;
let expandList = null;
let resolvedLookupObject = null;
/**
 * @type {import('vue').ShallowRef<
 *     import('@vueda/use/useResolvedLookupObjects.js').ResolvedLookupObjectsInstance|null
 * >}
 */
const resolvedLookupObjects = shallowRef(null);
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
                useResolvedLookupObject(toRef(props, "app"), toRef(props, "model"), lookupPk, fieldsList, expandList),
            );
            resolvedLookupObjects.value = es.run(() =>
                useResolvedLookupObjects(toRef(props, "app"), toRef(props, "model"), lookupPks, fieldsList, expandList),
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
            if (resolvedLookupObjects.value) {
                resolvedLookupObjects.value.effectScope.stop();
                resolvedLookupObjects.value = null;
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

const choiceOptions = computed(() => (Array.isArray(props.options) ? props.options : []));

const choiceValue = computed(() => {
    if (!choiceOptions.value.length) {
        return undefined;
    }
    return choiceDisplay(widgetContext.state.combinedValue, choiceOptions.value, {
        optionLabel: props.optionLabel,
        optionValue: props.optionValue,
    });
});

const lookupLoading = computed(() => !!(resolvedReactive.loading || resolvedLookupObjects.value?.loading));

/**
 * One entry for each related object of an array value in lookup mode: its label, and its pk when
 * the object is known. A label without a pk renders as plain text.
 */
const relatedItems = computed(() => {
    if (!isLookupMode.value || !isManyValue.value) {
        return [];
    }
    return widgetContext.state.combinedValue.map((related, index) => {
        const object = isExpandedManyValue.value ? related : resolvedLookupObjects.value?.objects[related + ""];
        const pk = object?.[state.pkKey];
        // An expanded entry is an object, so it has no text of its own to fall back to.
        const rawLabel = isExpandedManyValue.value ? "" : related;
        return { key: index, pk, label: String(object?.formatted_name ?? pk ?? rawLabel ?? "") };
    });
});

const readonlyValue = computed(() => {
    if (props.loading || lookupLoading.value) {
        return "\u00A0";
    }
    if (isLookupMode.value && isManyValue.value) {
        return relatedItems.value.map((item) => item.label).join(", ");
    }
    return (
        props.foreignKeyObj?.formatted_name ??
        resolvedReactive.object?.formatted_name ??
        choiceValue.value ??
        widgetContext.state.combinedValue
    );
});
const pkValue = computed(() => {
    return props.foreignKeyObj ? props.foreignKeyObj[state.pkKey] : resolvedReactive.object?.[state.pkKey];
});

/**
 * The labels that render as links in lookup mode. A foreign-key value gives one entry, and an array value gives one
 * entry for each related object. The list is empty while a lookup is loading and when there is nothing to show.
 */
const linkItems = computed(() => {
    if (!isLookupMode.value) {
        return [];
    }
    if (isManyValue.value) {
        return lookupLoading.value || props.loading ? [] : relatedItems.value;
    }
    return readonlyValue.value ? [{ key: 0, pk: pkValue.value, label: readonlyValue.value }] : [];
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
                <slot name="default" :raw-value="widgetContext.state.combinedValue" :value="readonlyValue">
                    <template v-if="linkItems.length">
                        <span v-if="prefix" :class="theme('linkItemPrefix')">{{ prefix }}</span>
                        <template v-for="(item, index) in linkItems" :key="item.key">
                            <slot
                                :app="app"
                                :class="theme('linkItem')"
                                :field-name="widgetContext.state.combinedName"
                                :form-model-name="widgetContext.state.formModelName"
                                :label="item.label"
                                :model="model"
                                :name="linkItemResolvedSlotNames.name"
                                :pk="item.pk"
                                :raw-value="widgetContext.state.combinedValue"
                                view="read"
                            >
                                <link-model-view
                                    v-if="item.pk != null && item.pk !== ''"
                                    :app="app"
                                    :class="theme('linkItem')"
                                    :label="item.label"
                                    :model="model"
                                    :pk="item.pk"
                                    view="read"
                                />
                                <span v-else :class="theme('textItem')">{{ item.label }}</span>
                            </slot>
                            <span v-if="index < linkItems.length - 1">, </span>
                        </template>
                        <span v-if="suffix" :class="theme('linkItemSuffix')">{{ suffix }}</span>
                    </template>
                    <slot
                        v-else
                        :class="theme('textItem')"
                        :field-name="widgetContext.state.combinedName"
                        :form-model-name="widgetContext.state.formModelName"
                        :name="textItemResolvedSlotNames.name"
                        :raw-value="widgetContext.state.combinedValue"
                        :value="readonlyValue"
                    >
                        <span v-if="prefix" :class="theme('textItemPrefix')">{{ prefix }}</span>
                        <span :class="theme('textItem')">
                            {{ readonlyValue }}
                        </span>
                        <span v-if="suffix" :class="theme('textItemSuffix')">{{ suffix }}</span>
                    </slot>
                </slot>
            </div>
        </div>
    </div>
</template>
