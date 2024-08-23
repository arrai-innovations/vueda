<script setup>
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";

const props = defineProps({
    ...WIDGET_PROPS,
});

const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useComputedClasses(vuedaTailwind.WidgetReadOnly, widgetContext.state);
</script>

<template>
    <div :class="theme('root')">
        <div :class="theme('inner')">
            <div :class="theme('label')">
                <slot :label="widgetContext.state.combinedLabel" name="label">{{
                    widgetContext.state.combinedLabel
                }}</slot>
            </div>
            <div :class="theme('input')" v-bind="$attrs">
                <slot :value="widgetContext.state.combinedValue">{{ widgetContext.state.combinedValue }}</slot>
            </div>
        </div>
    </div>
</template>
