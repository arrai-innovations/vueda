<script setup>
import FormModel from "@vueda/components/FormModel.vue";
import { useForm } from "@vueda/use/useForm.js";
import { useTheme } from "@vueda/use/useTheme.js";

/**
 * Docs-only wrapper that renders a real {@link FormModel} the way a CRUDL view
 * does: a form body region (gutter sourced from the live view theme) wrapping the
 * generated fields. It stands in for the view's form plumbing without the parts
 * that need a backend or a router:
 *
 * - `useForm(props)` provides the `FormContextSymbol` that fields inject (and
 *   watches `initialValues` to seed/populate the form, mirroring a populated
 *   update view).
 * - `useTheme(viewTheme)` pulls the same `body` slot the real ViewCreate/ViewUpdate
 *   use for their form gutter, so the demo can never drift from the framework's
 *   actual padding again.
 *
 * Model metadata is seeded into the stores at app start (see
 * `fixtures/showcaseCustomer.js`), so `<FormModel>` resolves its config offline.
 * Because config resolution is async, usages must be wrapped in `<ClientOnly>`.
 */
const props = defineProps({
    /** Django app label of the seeded demo model. */
    app: { type: String, required: true },
    /** Model name of the seeded demo model. */
    model: { type: String, required: true },
    /** View key forwarded to FormModel for view-specific config selection. */
    view: { type: String, default: undefined },
    /** Ordered field names to render; controls which fields appear and their order. */
    fields: { type: Array, default: undefined },
    /** Initial form values. Watched by useForm; supply to render a populated form. */
    initialValues: { type: Object, default: () => ({}) },
    /** View theme key whose `body` slot supplies the form-body gutter (e.g. ViewCreate, ViewUpdate). */
    viewTheme: { type: String, default: "ViewCreate" },
});

// Provides FormContextSymbol for the fields below and seeds values from initialValues.
useForm(props);
const theme = useTheme(props.viewTheme);
</script>

<template>
    <div :class="theme('body')" data-qa="demo-form-model">
        <form @submit.prevent>
            <FormModel :app="app" :fields="fields" :model="model" :view="view" />
        </form>
    </div>
</template>
