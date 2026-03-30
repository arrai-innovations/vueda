<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import { SEARCHABLE_SELECT_PROPS, useSearchableSelect } from "@vueda/use/useSearchableSelect.js";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import omit from "lodash-es/omit.js";
import pick from "lodash-es/pick.js";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { ref, unref, useSlots } from "vue";

/**
 * Renders a single-value dropdown (PrimeVue Select) with an inline search input that filters options by querying the API.
 * In read-only mode, the selected value is displayed as a link to the related record's detail view.
 */

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    ...WIDGET_LABEL_PROPS,
    ...SEARCHABLE_SELECT_PROPS,
    ...THEME_OVERRIDE_PROPS,
    ...PASSTHROUGH_OPTION_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const effectivePt = useWarningClass(props, widgetContext.state);
const theme = useWidgetTheme("WidgetSearchableSelect", props, widgetContext.state);
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);

const selectRef = ref(null);

const searchableSelect = useSearchableSelect(props, widgetContext, selectRef);

// ### onContainerClick is an internal API on primevue's Select component ###
const handleLabelClick = (e) => unref(selectRef)?.onContainerClick?.(e);
</script>
<template>
    <div :class="theme('root')">
        <widget-label
            :id="widgetContext.state.widgetId"
            label-tag="div"
            v-bind="pick(props, Object.keys(WIDGET_LABEL_PROPS))"
            @click="handleLabelClick"
        >
            <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps" />
            </template>
            <template #default="{ class: labelControlClass }">
                <div :class="combineClasses(theme('inner'), labelControlClass)">
                    <LinkModelView
                        v-if="props.readonly"
                        :app="app"
                        class="whitespace-nowrap grow shrink-0"
                        :label="searchableSelect.selectedLabel"
                        :model="model"
                        :pk="widgetContext.state.combinedValue"
                        view="update"
                    />
                    <Select
                        v-else
                        v-bind="omit($attrs, 'value')"
                        ref="selectRef"
                        v-model="widgetContext.state.combinedValue"
                        :options="searchableSelect.options"
                        :option-value="searchableSelect.optionValue"
                        :option-label="searchableSelect.optionLabel"
                        :option-group-label="searchableSelect.optionGroupLabel"
                        :option-group-children="searchableSelect.optionGroupChildren"
                        :virtual-scroller-options="searchableSelect.virtualScrollerOptions"
                        :aria-labelledby="widgetContext.state.widgetId"
                        :disabled="widgetContext.state.disabled"
                        fluid
                        :invalid="widgetContext.state.validationState.invalid"
                        :pt="effectivePt"
                        show-clear
                        :aria-required="widgetContext.state.required"
                        :empty-message="searchableSelect.emptyMessage"
                        @before-show="searchableSelect.onBeforeShow"
                        @change="searchableSelect.onChange"
                        @hide="searchableSelect.onHide"
                        @blur="widgetContext.blur"
                        @focus="widgetContext.focus"
                    >
                        <template #value>
                            <template v-if="widgetContext.state.combinedValue">
                                {{ searchableSelect.selectedLabel }}
                            </template>
                            <span v-else>
                                {{ searchableSelect.placeholder }}
                            </span>
                        </template>
                        <template #header>
                            <div class="py-1.5 px-2 w-full flex">
                                <InputText
                                    :id="widgetContext.state.widgetId"
                                    v-model="searchableSelect.query"
                                    class="w-full"
                                    placeholder="Type to Search"
                                ></InputText>
                            </div>
                        </template>
                    </Select>
                </div>
            </template>
        </widget-label>
    </div>
</template>
