<script setup>
import { useList, useObject } from "@arrai-innovations/reactive-helpers";
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import omit from "lodash-es/omit.js";
import pick from "lodash-es/pick.js";
import Select from "primevue/select";
import { computed, reactive, ref, toRef, useSlots, watch } from "vue";

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
    fieldApp: {
        type: String,
        required: true,
    },
    fieldModel: {
        type: String,
        required: true,
    },
    fieldName: {
        type: String,
        required: true,
    },
    modelFields: {
        type: Array,
        default: () => [],
    },
    modelExpandFields: {
        type: Array,
        default: () => [],
    },
    searchKey: {
        type: String,
        default: "s",
    },
    options: {
        type: Array,
        default: undefined,
    },
    optionValue: {
        type: String,
        default: "id",
    },
    optionLabel: {
        type: String,
        default: "formatted_name",
    },
    multiple: {
        type: Boolean,
        default: false,
    },
    placeholder: {
        type: String,
        default: undefined,
    },
    pageKey: {
        type: String,
        default: "p",
    },
    pkKey: {
        type: String,
        default: "id",
    },
    readonly: {
        type: Boolean,
        default: false,
    },
    ...THEME_OVERRIDE_PROPS,
    ...PASSTHROUGH_OPTION_PROPS,
});
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), ref("list"));
const selectRef = ref(null);
const fetchedPages = ref(1);
const hasBeenFocused = ref(false);
const intendToList = computed(() => {
    return (!widgetContext.state.combinedValue || listSearch.value?.length) && hasBeenFocused.value;
});
const intendToRetrieve = computed(() => {
    return widgetContext.state.combinedValue;
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useWidgetTheme("WidgetSearchableSelect", props, widgetContext.state);
const effectivePt = useWarningClass(props, widgetContext.state);
const listSearch = ref("");
const instanceObjectProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    pkKey: toRef(props, "pkKey"),
    pk: computed(() => widgetContext.state.combinedValue),
    retrieveArgs: {
        f: toRef(props, "modelFields"),
        e: toRef(props, "modelExpandFields"),
    },
    intendToRetrieve,
});
const instanceObject = useObject({
    props: instanceObjectProps,
});

const modelListProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    retrieveArgs: {
        f: toRef(props, "modelFields"),
    },
    pkKey: toRef(props, "pkKey"),
    listArgs: {
        [props.pageKey]: fetchedPages,
        [props.searchKey]: listSearch,
        [props.pkKey]: computed(() => {
            if (!listSearch.value?.length) {
                return widgetContext.state.combinedValue ?? undefined;
            }
            return undefined;
        }),
        f: [computed(() => modelConfig.info?.pk), "formatted_name"],
    },
    intendToList,
});
const handleFocus = () => {
    hasBeenFocused.value = true;
    widgetContext.focus();
};
const callableOptionLabel = computed(() => {
    return typeof props.optionLabel === "function";
});
const modelList = useList({
    props: modelListProps,
    paged: true,
    keepOldPages: true,
    clearListOnListIntentTriggered: false,
});

watch(
    [toRef(props, "options")],
    ([options]) => {
        if (options) {
            modelList.managed.listInstance.clearList(); // TODO
            modelList.managed.listInstance.pageCallback(props.options);
            if (!modelListProps.textSearchRules) {
                if (callableOptionLabel.value) {
                    throw new Error(
                        "Cannot use options with a function for optionLabel when" + " using hardcoded options.",
                    );
                }
                modelListProps.textSearchRules = [props.optionLabel];
                modelListProps.textSearchValue = listSearch;
            }
        } else {
            if (modelListProps.textSearchRules) {
                modelListProps.textSearchRules = undefined;
                modelListProps.textSearchValue = undefined;
            }
        }
    },
    {
        immediate: true,
    },
);
const handleFilter = (event) => {
    fetchedPages.value = 1;
    listSearch.value = event.value;
};
const placeHolderText = computed(() => {
    return props.placeholder || `Select a ${props.model}`;
});

const perPage = computed(() => {
    return modelList.state?.perPage ?? 100;
});
const lastScrollerPageTracks = reactive({
    first: 0,
    last: 0,
});
const onLazyLoad = (event) => {
    if (event.first === lastScrollerPageTracks.first && event.last === lastScrollerPageTracks.last) {
        return;
    }
    lastScrollerPageTracks.first = event.first;
    lastScrollerPageTracks.last = event.last;
    if (event.last >= fetchedPages.value * perPage.value && event.last < modelList.state.totalRecords) {
        fetchedPages.value += 1;
    }
};

const onValueChange = () => {
    fetchedPages.value = 1;
};
const computedLabel = computed(() => {
    return modelList.state.objectsInOrder.find((obj) => obj[props.optionValue] === widgetContext.state.combinedValue)?.[
        props.optionLabel
    ];
});
const handleLabelClick = (e) => {
    if (selectRef.value) {
        selectRef.value.onContainerClick(e);
    }
};

const computedOptions = computed(() => {
    if (intendToRetrieve.value && listSearch.value?.length < 1) {
        return [instanceObject.state.object];
    } else if (intendToList.value) {
        return modelList.state.objectsInOrder;
    }
    return [];
});
watch(
    [computedOptions, () => widgetContext.state.combinedValue],
    ([options, value]) => {
        if (options.length && value) {
            const selected = options.find((option) => option[props.optionValue] === value);
            widgetContext.state.valueDetail = selected;
        }
    },
    { immediate: true, deep: true },
);

const handleHide = () => {
    if (intendToRetrieve.value) {
        selectRef.value.filterValue = "";
        listSearch.value = "";
    }
};

const handleShow = () => {
    if (intendToRetrieve.value) {
        const searchText = widgetContext.state.valueDetail?.[props.optionLabel] || "";
        selectRef.value.filterValue = searchText;
        listSearch.value = searchText;
    }
};
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
</script>
<template>
    <div :class="theme('root')">
        <widget-label
            :id="widgetContext.state.widgetId"
            tag="div"
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
                        :label="computedLabel"
                        :model="model"
                        :pk="widgetContext.state.combinedValue"
                        view="update"
                    />
                    <Select
                        v-else
                        v-bind="omit($attrs, 'value')"
                        ref="selectRef"
                        v-model="widgetContext.state.combinedValue"
                        :aria-labelledby="widgetContext.state.widgetId"
                        :disabled="widgetContext.state.disabled"
                        filter
                        :invalid="widgetContext.state.validationState.invalid"
                        :option-label="props.optionLabel"
                        :option-value="pkKey"
                        :options="computedOptions"
                        :placeholder="placeHolderText"
                        :pt="effectivePt"
                        reset-filter-on-clear
                        show-clear
                        :virtual-scroller-options="{
                            showSpacer: false,
                            lazy: true,
                            onLazyLoad: onLazyLoad,
                            itemSize: 38,
                            showLoader: true,
                            loading: modelList.state.loading,
                            autoSize: true,
                            inline: true,
                        }"
                        @blur="widgetContext.blur"
                        @change="onValueChange"
                        @filter="handleFilter"
                        @focus="handleFocus"
                        @hide="handleHide"
                        @show="handleShow"
                    />
                </div>
            </template>
        </widget-label>
    </div>
</template>
