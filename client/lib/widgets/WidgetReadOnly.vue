<script setup>
import { useObject } from "@arrai-innovations/reactive-helpers";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import { computed, reactive, toRef, useSlots } from "vue";

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
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useTheme("WidgetReadOnly", props, widgetContext.state);
const isActive = useIsActive();
const validAndActive = computed(
    () => !!(isActive.value && props.app && props.model && widgetContext.state.combinedValue),
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
    return instanceObject.state?.object?.formatted_name;
});
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
</script>

<template>
    <div :class="theme('root')">
        <div :class="theme('inner')">
            <widget-label :id="widgetContext.state.widgetId">
                <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                    <slot :name="slotName" v-bind="slotProps" />
                </template>
                <div v-bind="$attrs" :aria-labelledby="widgetContext.state.widgetId" :class="theme('input')">
                    <slot :value="readonlyValue || widgetContext.state.combinedValue">
                        <link-model-view
                            v-if="readonlyValue"
                            :app="app"
                            :button-class="{
                                root: 'px-0 py-0 gap-0 leading-none',
                                label: 'text-primary hover:underline',
                            }"
                            class="whitespace-nowrap grow shrink-0"
                            :label="readonlyValue"
                            :model="model"
                            :pk="widgetContext.state.combinedValue"
                            view="update"
                        />
                        <span v-else>
                            {{ widgetContext.state.combinedValue }}
                        </span>
                    </slot>
                </div>
            </widget-label>
        </div>
    </div>
</template>
