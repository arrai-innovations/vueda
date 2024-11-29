<script setup>
import { useList } from "@arrai-innovations/reactive-helpers";
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { allPagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import get from "lodash-es/get.js";
import omit from "lodash-es/omit.js";
import pick from "lodash-es/pick.js";
import AutoComplete from "primevue/autocomplete";
import { computed, reactive, ref, toRef, unref, useAttrs, useSlots } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    ...WIDGET_LABEL_PROPS,
    app: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    modelFields: {
        type: Array,
        default: () => [],
    },
    searchKey: {
        type: String,
        default: "s",
    },
    optionLabel: {
        type: String,
        description: "The field to use as the label for the options",
        default: "formatted_name",
    },
    optionValue: {
        type: String,
        description: "The field to use as the value for the options, and the returned value",
        default: "USE_PK",
    },
    displayLabel: {
        type: String,
        description: "The field to use as the label for the selected value",
        default: null,
    },
    ...THEME_OVERRIDE_PROPS,
    ...PASSTHROUGH_OPTION_PROPS,
});
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useWidgetTheme("WidgetAutoComplete", props, widgetContext.state);
const effectivePt = useWarningClass(props, widgetContext.state);

const listSearch = ref("");
const selectedValue = ref(null);

const computedPkKey = computed(() => modelConfig.info?.pk ?? "id");
const computedOptionValue = computed(() => {
    if (props.optionValue === "USE_PK") {
        return computedPkKey.value;
    }
    return props.optionValue;
});
const computedOptionLabel = computed(() => {
    // if optionLabel and not displayLabel, use optionLabel
    if (!props.displayLabel) {
        return props.optionLabel;
    } else {
        return widgetContext.state.focused ? props.optionLabel : props.displayLabel;
    }
});

const modelListArgs = computed(() => {
    const f = [];
    if (props.modelFields.length) {
        f.concat(props.modelFields);
    } else {
        f.push(unref(computedOptionValue));
        f.push(props.optionLabel);
    }
    const pkKey = unref(computedPkKey);
    if (!f.includes(pkKey)) {
        f.push(pkKey);
    }
    const listArgs = {
        f,
    };
    if (listSearch.value) {
        listArgs[props.searchKey] = listSearch.value;
    } else if (widgetContext.state.combinedValue) {
        listArgs[unref(computedOptionValue)] = widgetContext.state.combinedValue;
    }
    return listArgs;
});

const modelListProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    retrieveArgs: {},
    pkKey: computedPkKey,
    listArgs: modelListArgs,
    intendToList: computed(
        () => modelConfig.loading === false && (!!listSearch.value || !!widgetContext.state.combinedValue),
    ),
});
const modelListInstance = useList({
    props: modelListProps,
    functions: {
        list: allPagePaginatedListCrudAdaptor,
    },
    paged: true,
    keepOldPages: true,
    clearListOnListIntentTriggered: true,
});
const modelItem = computed(() => {
    let match = null;
    if (modelListInstance.state.objectsInOrder?.length > 0) {
        // noinspection EqualityComparisonWithCoercionJS
        match = modelListInstance.state.objectsInOrder?.find(
            (option) => get(option, unref(computedOptionValue)) == widgetContext.state.combinedValue,
        );
    }
    return match ?? widgetContext.state.combinedValue;
});
const valueUpdated = (selected) => {
    if (selected && typeof selected === "object" && "value" in selected) {
        const value = get(selected, unref(computedOptionValue));
        widgetContext.state.combinedValue = value;
        selectedValue.value = value;
    } else {
        widgetContext.state.combinedValue = selected;
        selectedValue.value = null;
    }
};
const search = (event) => {
    setTimeout(() => {
        if (event.query.trim().length) {
            listSearch.value = event.query;
        }
    }, 250);
};

const attrs = useAttrs();
let blurTimeout = null;
const delayedBlur = (e) => {
    if (blurTimeout) {
        clearTimeout(blurTimeout);
    }
    blurTimeout = setTimeout(() => {
        widgetContext.blur();
        if (typeof attrs["on-focus"] === "function") {
            attrs["on-focus"](e);
        }
    }, 250);
};
const cancelBlurIfFocused = (e) => {
    if (blurTimeout) {
        clearTimeout(blurTimeout);
        blurTimeout = null;
    }
    widgetContext.focus();
    if (typeof attrs["on-blur"] === "function") {
        attrs["on-blur"](e);
    }
};
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
</script>
<template>
    <div :class="theme('root')">
        <widget-label :for="widgetContext.state.widgetId" v-bind="pick(props, Object.keys(WIDGET_LABEL_PROPS))">
            <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps" />
            </template>
            <template #default="{ class: labelControlClass }">
                <div :class="combineClasses(theme('inner'), labelControlClass)">
                    <AutoComplete
                        :disabled="widgetContext.state.disabled"
                        force-selection
                        :input-id="widgetContext.state.widgetId"
                        :invalid="widgetContext.state.validationState.invalid"
                        :loading="modelListInstance.state.loading"
                        :model-value="modelItem"
                        :name="widgetContext.state.combinedName"
                        :option-label="computedOptionLabel"
                        :option-value="computedOptionValue"
                        :pt="effectivePt"
                        :suggestions="modelListInstance.state.objectsInOrder"
                        v-bind="omit($attrs, ['value'])"
                        @blur="delayedBlur"
                        @complete="search"
                        @focus="cancelBlurIfFocused"
                        @update:model-value="(selected) => valueUpdated(selected)"
                    />
                </div>
            </template>
        </widget-label>
    </div>
</template>
