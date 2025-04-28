<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useResolvedLookupObject } from "@vueda/use/useResolvedLookupObject.js";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import omit from "lodash-es/omit.js";
import pick from "lodash-es/pick.js";
import { computed, effectScope, reactive, ref, toRef, unref, useSlots, watch } from "vue";

const props = defineProps({
    ...WIDGET_PROPS,
    ...WIDGET_LABEL_PROPS,
    app: {
        type: String,
        default: undefined,
    },
    model: {
        type: String,
        default: undefined,
    },
    foreignKeyObj: {
        type: Object,
        default: undefined,
    },
    loading: {
        type: Boolean,
        default: false,
    },
    prefix: {
        type: String,
        default: "",
    },
    suffix: {
        type: String,
        default: "",
    },
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
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
watch(
    isLookupMode,
    (lookupMode) => {
        if (lookupMode) {
            modelConfig = es.run(() => useModelConfig(toRef(props, "app"), toRef(props, "model"), "list"));
            fieldsList = es.run(() =>
                computed(() =>
                    !unref(isLookupMode)
                        ? []
                        : (props.modelFields?.length ? props.modelFields : modelConfig.config?.fetchFields) || [],
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
const isActive = useIsActive();
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
    return props.foreignKeyObj ? props.foreignKeyObj[props.pkKey] : resolvedReactive.object?.[props.pkKey];
});
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
const widgetLabelProps = computed(() => {
    const wlp = pick(props, Object.keys(WIDGET_LABEL_PROPS));
    wlp.required = false;
    wlp.help = undefined;
    return wlp;
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
            <widget-label :id="widgetContext.state.widgetId" label-tag="div" v-bind="widgetLabelProps">
                <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                    <slot :name="slotName" v-bind="slotProps" />
                </template>
                <template #default="{ class: labelControlClass }">
                    <div
                        v-bind="omit($attrs, ['class'])"
                        :aria-labelledby="widgetContext.state.widgetId"
                        :class="combineClasses(theme('value'), labelControlClass, $attrs.class)"
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
                </template>
            </widget-label>
        </div>
    </div>
</template>
