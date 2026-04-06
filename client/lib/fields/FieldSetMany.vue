<script setup>
import { ControlButton } from "@vueda/controls/button";
import { ShellFieldDescription, ShellFieldMessage } from "@vueda/shell/field";
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { watchIfDev } from "@vueda/utils/dev.js";
import { Plus, X } from "lucide-vue-next";
import { computed, useAttrs } from "vue";

/**
 * A field that manages a list of values by rendering one instance of
 * `manyComponent` per entry. Provides Add and Remove buttons so users can
 * grow or shrink the list, and the first entry is always required while
 * subsequent entries are optional.
 */
defineOptions({});

const attrs = useAttrs();
const props = defineProps({
    ...FIELD_PROPS,
    /** The component used to render each individual entry in the list. */
    manyComponent: {
        type: Object,
        required: true,
    },
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([...FIELD_EMITS]);

const fieldContext = useField(props, emit);
const logger = useDevLogger({ fieldContext });

const fieldProps = computed(() => {
    const values = fieldContext.state.value;
    const indexes = Array.isArray(values) && values.length ? values.map((_, index) => index) : [0];
    return indexes.map((index) => ({
        ...props,
        ...attrs,
        name: `${fieldContext.state.name}[${index}]`,
    }));
});

watchIfDev(
    () => fieldContext.state.value,
    (value) => {
        if (value !== null && value !== undefined && !Array.isArray(value)) {
            logger.warn(`Expected value to be an array or null/undefined, got:`, value);
        }
    },
    { immediate: true },
);

const onAdd = () => {
    fieldContext.state.value = [...(fieldContext.state.value ?? []), undefined];
};

const onDestroy = (index) => {
    fieldContext.state.value = (fieldContext.state.value ?? []).filter((_, i) => i !== index);
};
const theme = useTheme("FieldSetMany", props);
</script>
<template>
    <div data-qa="field-set-many">
        <div :class="theme('header')">
            <!-- @slot [label] Override the field label. -->
            <slot :field-label="fieldContext.state.label" :field-name="fieldContext.state.name" name="label">
                <label :class="theme('label')" :for="fieldContext.state.name">
                    {{ fieldContext.state.label }}
                </label>
            </slot>
            <!-- @slot [add] Override the add button. -->
            <slot name="add" @click="onAdd">
                <ControlButton variant="outline" size="sm" @click="onAdd"><Plus /> Add</ControlButton>
            </slot>
        </div>
        <div v-if="fieldProps?.length">
            <template v-for="(fieldProp, index) in fieldProps" :key="index">
                <!-- @slot [field(fieldName)] Override the rendered row for a specific field entry. -->
                <slot :name="`field(${fieldProp.name})`" v-bind="{ fieldProps, index }">
                    <div :class="theme('row')">
                        <div :class="theme('component')">
                            <component :is="props.manyComponent" v-bind="fieldProp" :required="index > 0">
                                <slot :hidden="true" />
                            </component>
                        </div>
                        <div v-if="index">
                            <!-- @slot [destroy] Override the delete button for a row. -->
                            <slot name="destroy" @click="onDestroy(index)">
                                <ControlButton variant="ghost" size="icon-sm" @click="onDestroy(index)">
                                    <X />
                                    <span class="sr-only">Remove entry</span>
                                </ControlButton>
                            </slot>
                        </div>
                    </div>
                </slot>
            </template>
        </div>
        <ShellFieldDescription v-if="fieldContext.state.help">
            {{ fieldContext.state.help }}
        </ShellFieldDescription>
        <ShellFieldMessage :messages="Object.values(fieldContext.state.errors)" />
        <ShellFieldMessage
            v-if="Object.keys(fieldContext.state.messages).length"
            severity="warning"
            :messages="Object.values(fieldContext.state.messages)"
        />
    </div>
</template>
