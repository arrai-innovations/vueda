<script setup>
import showcaseCss from "../showcase.css?inline";
import { onMounted, ref } from "vue";

const host = ref(null);
const shadowTarget = ref(null);

onMounted(() => {
    const shadow = host.value.attachShadow({ mode: "open" });

    // Keep VitePress default theme CSS out of the demo boundary. The
    // showcase stylesheet contains Tailwind utilities, VUEDA tokens, and
    // the docs-only forced-state variants needed by component matrices.
    const style = document.createElement("style");
    style.textContent = showcaseCss;
    shadow.appendChild(style);

    const container = document.createElement("div");
    container.style.display = "contents";
    shadow.appendChild(container);
    shadowTarget.value = container;
});
</script>

<template>
    <div ref="host" class="not-prose">
        <Teleport v-if="shadowTarget" :to="shadowTarget">
            <slot />
        </Teleport>
    </div>
</template>
