<script setup>
import DetailView from "@vueda/components/DetailView.vue";
import { useForm } from "@vueda/use/useForm.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import { inject, reactive } from "vue";

/**
 * Read-only detail view that fetches and displays a single model instance identified by its
 * primary key.
 */
defineOptions({
    inheritAttrs: false,
});

defineProps({
    app: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    pk: {
        type: String,
        required: true,
    },
});
const viewName = "read";

const emit = defineEmits(["object", "loading", "related-object", "calculated-object", "form-object", "form-context"]);

if (!inject(LookupContextSymbol, null)) {
    useLookupContext();
}

const formContextProps = reactive({
    initialValues: {},
});
useForm(formContextProps);
</script>

<template>
    <detail-view
        v-model="formContextProps.initialValues"
        :app="app"
        :model="model"
        :pk="pk"
        :view-name="viewName"
        v-bind="$attrs"
        @form-context="emit('form-context', $event)"
        @form-object="emit('form-object', $event)"
        @loading="emit('loading', $event)"
        @object="emit('object', $event)"
    >
        <template v-for="(_, slot) in $slots" #[slot]="slotProps">
            <slot :name="slot" v-bind="slotProps || {}" />
        </template>
    </detail-view>
</template>
