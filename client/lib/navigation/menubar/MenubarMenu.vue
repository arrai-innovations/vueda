<script setup>
import { MenubarMenu } from "reka-ui";

/**
 * A single menu within a menubar.
 */
defineOptions({});

const props = defineProps({
    /** A unique value identifying this menu within the menubar. */
    value: { type: String, default: undefined },
});
</script>

<template>
    <MenubarMenu data-slot="menubar-menu" v-bind="props">
        <slot />
    </MenubarMenu>
</template>
