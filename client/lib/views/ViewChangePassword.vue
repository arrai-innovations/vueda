<script setup>
import AuthForm from "@vueda/components/AuthForm.vue";
import FieldString from "@vueda/fields/FieldString.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import WidgetInput from "@vueda/widgets/WidgetInput.vue";
import { getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import { reactive, useSlots } from "vue";

/**
 * Form that allows an authenticated user to change their password by providing their current
 * password and confirming the new one.
 *
 * @vueda-slot-forward AuthForm
 */
defineOptions({});

const formProps = reactive({
    initialValues: {
        old_password: "",
        new_password1: "",
        new_password2: "",
    },
});
const userStore = storeUser();

const handleSubmit = ({ formValues }) => {
    return userStore.changePassword({
        old_password: formValues.old_password,
        new_password1: formValues.new_password1,
        new_password2: formValues.new_password2,
    });
};

const slots = useSlots();
const widgetLabelSlotNames = getWidgetSlotsComputed(slots);
</script>
<template>
    <auth-form :run-action="handleSubmit" :form-props="formProps">
        <template #action-form-inner>
            <!-- Replaces the entire current-password field row, including its label. -->
            <slot name="field(old_password)" label="Current Password">
                <field-string label="Current Password" name="old_password">
                    <!-- Replaces the current-password input widget; receives standard widget props. -->
                    <slot
                        name="widget(old_password)"
                        :required="true"
                        type="password"
                        autocomplete="current-password"
                        :feedback="false"
                        toggle-mask
                    >
                        <widget-input
                            :required="true"
                            type="password"
                            autocomplete="current-password"
                            :feedback="false"
                            toggle-mask
                        >
                            <template v-for="slotName in widgetLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                                <slot :name="slotName" v-bind="slotProps" />
                            </template>
                        </widget-input>
                    </slot>
                </field-string>
            </slot>
            <!-- Replaces the entire new-password field row, including its label. -->
            <slot name="field(new_password1)" label="New Password">
                <field-string label="New Password" name="new_password1">
                    <!-- Replaces the new-password input widget; receives standard widget props. -->
                    <slot name="widget(new_password1)" :required="true" type="password" toggle-mask :feedback="false">
                        <widget-input :required="true" type="password" toggle-mask :feedback="false">
                            <template v-for="slotName in widgetLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                                <slot :name="slotName" v-bind="slotProps" />
                            </template>
                        </widget-input>
                    </slot>
                </field-string>
            </slot>
            <!-- Replaces the entire confirm-password field row, including its label. -->
            <slot name="field(new_password2)" label="Confirm New Password">
                <field-string label="Confirm New Password" name="new_password2">
                    <!-- Replaces the confirm-password input widget; receives standard widget props. -->
                    <slot name="widget(new_password2)" :required="true" type="password" toggle-mask :feedback="false">
                        <widget-input :required="true" type="password" toggle-mask :feedback="false">
                            <template v-for="slotName in widgetLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                                <slot :name="slotName" v-bind="slotProps" />
                            </template>
                        </widget-input>
                    </slot>
                </field-string>
            </slot>
        </template>
        <template v-for="(_, slot) in $slots" #[slot]="slotProps">
            <slot :name="slot" v-bind="slotProps || {}" />
        </template>
    </auth-form>
</template>
