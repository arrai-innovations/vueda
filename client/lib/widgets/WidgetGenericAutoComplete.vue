<script setup>
import EmptyComponent from "@vueda/components/EmptyComponent.vue";
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import InputGroup from "primevue/inputgroup";
import TreeSelect from "primevue/treeselect";
import { ref } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    type: {
        type: String,
        default: "text",
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);

const testNodes = [
    {
        key: 1,
        label: "Product",
        value: "Product",
        children: [
            {
                key: 2,
                label: "product1",
                value: "product1",
            },
            {
                key: 3,
                label: "product2",
                value: "product2",
            },
        ],
    },
    {
        label: "Orders",
        value: "Orders",
        key: 4,
        children: [
            {
                key: 5,
                label: "order1",
                value: "order1",
            },
            {
                key: 6,
                label: "order2",
                value: "order2",
            },
        ],
    },
];
const selectedValue = ref(null);
const theme = useComputedClasses(vuedaTailwind.WidgetInput, widgetContext.state);
const valueUpdated = (selected) => {
    console.log("selected: ", selected);
    selectedValue.value = selected;
};
</script>

<template>
    <div :class="theme('root')">
        {{ selectedValue }}
        <widget-label :hidden="hidden" :label-class="theme('label')">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                <component :is="$slots.prefix || $slots.suffix ? InputGroup : EmptyComponent">
                    <slot v-if="$slots.prefix" name="prefix" />
                    <TreeSelect
                        v-model="selectedValue"
                        class="md:w-80 w-full"
                        :model-value="selectedValue"
                        :options="testNodes"
                        @blur="widgetContext.blur"
                        @focus="widgetContext.focus"
                    /><slot
                        v-if="$slots.suffix"
                        name="suffix"
                        @update:model-value="(selected) => valueUpdated(selected)"
                    />
                </component>
            </div>
        </widget-label>
    </div>
</template>

//

<!--<template>-->
<!--    <div class="card flex justify-center">-->
<!--        <AutoComplete v-model="selectedCity" :suggestions="filteredCities" @complete="search" optionLabel="label" optionGroupLabel="label" optionGroupChildren="items" placeholder="Hint: type 'a'">-->
<!--            <template #optiongroup="slotProps">-->
<!--                <div class="flex items-center country-item">-->
<!--                    <img :alt="slotProps.option.label" src="https://primefaces.org/cdn/primevue/images/flag/flag_placeholder.png" :class="`flag flag-${slotProps.option.code.toLowerCase()} mr-2`" style="width: 18px" />-->
<!--                    <div>{{ slotProps.option.label }}</div>-->
<!--                </div>-->
<!--            </template>-->
<!--        </AutoComplete>-->
<!--    </div>-->
<!--</template>-->

<!--<script setup>-->
<!--import { ref } from "vue";-->
<!--import { FilterMatchMode, FilterService } from '@primevue/core/api';-->

<!--const cities = ref();-->
<!--const selectedCity = ref();-->
<!--const filteredCities = ref();-->
<!--const groupedCities = ref([-->
<!--    {-->
<!--        label: 'Germany',-->
<!--        code: 'DE',-->
<!--        items: [-->
<!--            { label: 'Berlin', value: 'Berlin' },-->
<!--            { label: 'Frankfurt', value: 'Frankfurt' },-->
<!--            { label: 'Hamburg', value: 'Hamburg' },-->
<!--            { label: 'Munich', value: 'Munich' }-->
<!--        ]-->
<!--    },-->
<!--    {-->
<!--        label: 'USA',-->
<!--        code: 'US',-->
<!--        items: [-->
<!--            { label: 'Chicago', value: 'Chicago' },-->
<!--            { label: 'Los Angeles', value: 'Los Angeles' },-->
<!--            { label: 'New York', value: 'New York' },-->
<!--            { label: 'San Francisco', value: 'San Francisco' }-->
<!--        ]-->
<!--    },-->
<!--    {-->
<!--        label: 'Japan',-->
<!--        code: 'JP',-->
<!--        items: [-->
<!--            { label: 'Kyoto', value: 'Kyoto' },-->
<!--            { label: 'Osaka', value: 'Osaka' },-->
<!--            { label: 'Tokyo', value: 'Tokyo' },-->
<!--            { label: 'Yokohama', value: 'Yokohama' }-->
<!--        ]-->
<!--    }-->
<!--]);-->

<!--const search = (event) => {-->
<!--    let query = event.query;-->
<!--    let newFilteredCities = [];-->

<!--    for (let country of groupedCities.value) {-->
<!--        let filteredItems = FilterService.filter(country.items, ['label'], query, FilterMatchMode.CONTAINS);-->
<!--        if (filteredItems && filteredItems.length) {-->
<!--            newFilteredCities.push({...country, ...{items: filteredItems}});-->
<!--        }-->
<!--    }-->

<!--    filteredCities.value = newFilteredCities;-->

<!--}-->
<!--</script>-->
