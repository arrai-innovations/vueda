<script setup>
import { library } from "@arrai-innovations/fontawesome-svg-core";
import { faSpinner } from "@arrai-innovations/sharp-solid-svg-icons";
import { FontAwesomeIcon } from "@arrai-innovations/vue-fontawesome";

library.add(faSpinner);
</script>

<template>
    <font-awesome-icon class="animate-spin" fixed-width :icon="faSpinner" />
</template>
