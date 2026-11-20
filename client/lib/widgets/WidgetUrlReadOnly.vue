<script setup>
import UrlDisplay from "@vueda/display/url-display/UrlDisplay.vue";
import WidgetReadOnly from "@vueda/widgets/WidgetReadOnly.vue";

/**
 * Read-only presentation for URL fields. Wraps {@link WidgetReadOnly} so the row keeps
 * its label association, theme slots, and lookup behavior, and fills the value with
 * {@link UrlDisplay}: a URL as a link to that URL.
 *
 * Two values keep the plain `WidgetReadOnly` rendering. An array, from a many-valued field, has
 * no single link to show. A value that `WidgetReadOnly` shows as something other than the
 * stored value, such as a choice label, keeps that text.
 *
 * `fieldMappings` selects this widget through `readOnlyWidget`.
 *
 * A consumer's own `default` slot still wins: this widget supplies the link rendering
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
        <template v-if="!$slots.default" #default="{ rawValue, value }">
            <!-- When this renders nothing, WidgetReadOnly shows its own default content. -->
            <url-display v-if="!Array.isArray(rawValue) && value === rawValue" :value="rawValue" inline />
        </template>
    </widget-read-only>
</template>
