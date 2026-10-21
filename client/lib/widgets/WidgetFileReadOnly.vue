<script setup>
import FileDisplay from "@vueda/display/file-display/FileDisplay.vue";
import WidgetReadOnly from "@vueda/widgets/WidgetReadOnly.vue";

/**
 * Read-only presentation for file and image fields. Wraps {@link WidgetReadOnly} so the row
 * keeps its label association, theme slots, and lookup behavior, and fills the value with
 * {@link FileDisplay}: a link labelled with the file name, instead of the `{ name, url }`
 * object that the plain read-only widget prints.
 *
 * `fieldMappings` selects this widget through `readOnlyWidget`.
 *
 * A consumer's own `default` slot still wins: this widget supplies the file rendering
 * only when the field has no `widget(fieldName)default` override.
 */
defineOptions({
    inheritAttrs: false,
});
</script>

<template>
    <widget-read-only v-bind="$attrs">
        <template v-for="slotName in Object.keys($slots)" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps || {}" />
        </template>
        <template v-if="!$slots.default" #default="{ rawValue }">
            <file-display :value="rawValue" inline />
        </template>
    </widget-read-only>
</template>
