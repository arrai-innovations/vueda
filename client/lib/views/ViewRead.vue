<script setup>
import DetailView from "@vueda/components/DetailView.vue";
import { useForm } from "@vueda/use/useForm.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import { inject, reactive } from "vue";

/**
 * Read-only detail view that fetches and displays a single model instance identified by its
 * primary key.
 *
 * @vueda-slot-forward DetailView
 */
defineOptions({
    inheritAttrs: false,
});

defineProps({
    /** Django app label that owns the model. */
    app: {
        type: String,
        required: true,
    },
    /** Django model name used to resolve API endpoints and configuration. */
    model: {
        type: String,
        required: true,
    },
    /** Primary key of the object instance to fetch and display. */
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
