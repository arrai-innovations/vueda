<script setup>
import ClickToCopyText from "@vueda/components/ClickToCopyText.vue";
import "@vueda/theme/vueda-tailwind/widgets/WidgetTemplateLegend.theme.js";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { inject } from "vue";

/**
 * A read-only widget that displays a legend of available `$variable` substitution tags, rendered
 * as a labelled list with click-to-copy tag values; the default slot can replace the entire list.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);

const theme = useWidgetTheme("WidgetTemplateLegend", props);
</script>
<template>
    <div :class="theme('root')" data-qa="widget-template-legend-root">
        <div :id="fieldContext?.state.fieldId" :class="theme('inner')" data-qa="widget-template-legend-inner">
            <!-- Replaces the default tag list; receives the current widget `value` as a slot prop. -->
            <slot name="default" :value="widgetContext.state.combinedValue">
                <div v-if="widgetContext.state.combinedValue">
                    <p>These are the replacement tags available in text fields below:</p>
                    <ul data-qa="widget-template-legend-list">
                        <li
                            v-for="(value, key) in widgetContext.state.combinedValue"
                            :key="key"
                            :class="theme('listItem')"
                            data-qa="widget-template-legend-list-item"
                        >
                            {{ value.description }}:
                            <ClickToCopyText :text="`$${key}`" />
                        </li>
                    </ul>
                </div>
            </slot>
        </div>
    </div>
</template>
