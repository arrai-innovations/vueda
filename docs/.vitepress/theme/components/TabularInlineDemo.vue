<script setup>
import FormModel from "@vueda/form/form-model/FormModel.vue";
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { useForm } from "@vueda/use/useForm.js";
import { getAppModelDotName } from "@vueda/utils/case.js";

// All editing stays in the local form context.
useForm({
    initialValues: {
        contacts: [
            { name: "Mara Tani", email: "mara@example.com" },
            { name: "Jordan Reyes", email: "jordan@example.com" },
        ],
    },
});

const fieldDetails = {
    contacts: { name: "contacts", label: "Contacts", many: true, readOnly: false, typeSerializer: "ListSerializer" },
};
const contactsExpansion = {
    name: "contacts",
    // Grid values use row-local paths; FormModel qualifies the field names.
    f: {
        name: { value: "name", label: "Name", typeSerializer: "CharField", required: true },
        email: { value: "email", label: "Email", typeSerializer: "EmailField", required: true },
    },
};

// Cache a separate model so this example resolves offline without changing other demos.
const demoModel = { app: "showcase", model: "contactBook" };
storeModelInfo().infos[getAppModelDotName(demoModel)] = {
    appLabel: demoModel.app,
    model: demoModel.model,
    verbose_name: "Contact book",
    verbose_name_plural: "Contact books",
    pk: "id",
    fields: fieldDetails,
    expand: [contactsExpansion],
    actions: [{ name: "update", detail: true, bulk: false, methodNames: ["put"] }],
    permissions: [],
};
const fieldComponents = {
    contacts: "FieldSetTabularInline",
};
const fieldProps = {
    contacts: { hiddenByDefault: "never", help: "Keep contact details current.", tableBreakpoint: "sm" },
};
</script>

<template>
    <form @submit.prevent>
        <FormModel
            v-bind="demoModel"
            view="update"
            :fields="['contacts']"
            :expand="['contacts']"
            :field-components="fieldComponents"
            :field-props="fieldProps"
        />
    </form>
</template>
