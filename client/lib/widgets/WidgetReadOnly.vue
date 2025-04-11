<script setup>
import { useObject } from "@arrai-innovations/reactive-helpers";
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import omit from "lodash-es/omit.js";
import pick from "lodash-es/pick.js";
import { computed, reactive, toRef, useSlots, watch } from "vue";

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
    pkKey: {
        type: String,
        default: "id",
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
const theme = useWidgetTheme("WidgetReadOnly", props, widgetContext.state, {
    hidden: toRef(props, "hidden"),
});
const isActive = useIsActive();
const validAndActive = computed(
    () => !!(!props.foreignKeyObj && isActive.value && props.app && props.model && widgetContext.state.combinedValue),
);
const instanceObjectProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    pkKey: toRef(props, "pkKey"),
    pk: toRef(widgetContext.state, "combinedValue"),
    retrieveArgs: {
        f: [],
    },
    intendToRetrieve: validAndActive,
});
const instanceObject = useObject({
    props: instanceObjectProps,
});

const readonlyValue = computed(() => {
    if (instanceObject.state?.loading || props.loading) {
        return "Loading...";
    }
    return props.foreignKeyObj ? props.foreignKeyObj.formatted_name : instanceObject.state?.object?.formatted_name;
});
const pkValue = computed(() => {
    return props.foreignKeyObj ? props.foreignKeyObj[props.pkKey] : instanceObject.state?.object?.[props.pkKey];
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
                        <slot :value="readonlyValue || widgetContext.state.combinedValue">
                            <slot
                                v-if="readonlyValue"
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
