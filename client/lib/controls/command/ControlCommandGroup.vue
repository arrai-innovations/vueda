<script setup>
import { provideCommandGroupContext, useCommand } from "./command-context.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ListboxGroup, ListboxGroupLabel, useId } from "reka-ui";
import { computed, onMounted, onUnmounted } from "vue";

/**
 * Groups related ControlCommandItem elements with an optional heading.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** Optional heading text displayed above the group. */
    heading: { type: String, default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const { allGroups, filterState } = useCommand();
const id = useId();

const isRender = computed(() => (!filterState.search ? true : filterState.filtered.groups.has(id)));

provideCommandGroupContext({ id });
onMounted(() => {
    if (!allGroups.value.has(id)) allGroups.value.set(id, new Set());
});
onUnmounted(() => {
    allGroups.value.delete(id);
});

const theme = useTheme("ControlCommandGroup", props);
</script>

<template>
    <ListboxGroup
        v-bind="delegatedProps"
        :id="id"
        data-slot="command-group"
        :class="[theme('root'), props.class]"
        :hidden="isRender ? undefined : true"
    >
        <ListboxGroupLabel
            v-if="heading"
            data-slot="command-group-heading"
            class="px-2 py-1.5 text-xs font-medium text-muted-foreground"
        >
            {{ heading }}
        </ListboxGroupLabel>
        <slot />
    </ListboxGroup>
</template>
