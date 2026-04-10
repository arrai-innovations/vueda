<script setup>
import { useCommand, useCommandGroup } from "./command-context.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit, useCurrentElement } from "@vueuse/core";
import { ListboxItem, useForwardPropsEmits, useId } from "reka-ui";
import { computed, onMounted, onUnmounted, ref } from "vue";

/**
 * A selectable command option within ControlCommandList or ControlCommandGroup.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The value associated with this item. */
    value: { type: [String, Number, Boolean, Object], required: true },
    /** When true, prevents user interaction. */
    disabled: { type: Boolean, default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});
const emits = defineEmits(["select"]);

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const id = useId();
const { filterState, allItems, allGroups } = useCommand();
const groupContext = useCommandGroup();

const isRender = computed(() => {
    if (!filterState.search) {
        return true;
    } else {
        const filteredCurrentItem = filterState.filtered.items.get(id);
        // If the filtered items is undefined means not in the all items map yet.
        // Do the first render to add into the map.
        if (filteredCurrentItem === undefined) {
            return true;
        }

        // Check with filter
        return filteredCurrentItem > 0;
    }
});

const itemRef = ref();
const currentElement = useCurrentElement(itemRef);
onMounted(() => {
    if (!(currentElement.value instanceof HTMLElement)) return;

    // textValue to perform filter
    allItems.value.set(id, currentElement.value.textContent ?? props.value?.toString() ?? "");

    const groupId = groupContext?.id;
    if (groupId) {
        if (!allGroups.value.has(groupId)) {
            allGroups.value.set(groupId, new Set([id]));
        } else {
            allGroups.value.get(groupId)?.add(id);
        }
    }
});
onUnmounted(() => {
    allItems.value.delete(id);
});

const theme = useTheme("ControlCommandItem", props);
</script>

<template>
    <ListboxItem
        v-if="isRender"
        v-bind="forwarded"
        :id="id"
        ref="itemRef"
        data-slot="command-item"
        :class="[theme('root'), props.class]"
        @select="
            () => {
                filterState.search = '';
            }
        "
    >
        <slot />
    </ListboxItem>
</template>
