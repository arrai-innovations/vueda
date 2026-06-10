<script setup>
import showcaseCss from "../showcase.css?inline";
import faStyles from "@fortawesome/fontawesome-svg-core/styles.css?inline";
import { useData } from "vitepress";
import { onMounted, ref, watch } from "vue";

const host = ref(null);
const shadowTarget = ref(null);
const { isDark } = useData();

onMounted(() => {
    const shadow = host.value.attachShadow({ mode: "open" });

    // FontAwesome's base stylesheet (svg-inline--fa { height: 1em }) is loaded
    // into the document head with autoAddCss disabled, so it never crosses this
    // shadow boundary. Without it, FA SVGs lose their 1em sizing and render at
    // full width; inject it here so icons in demos size like a real app.
    const faStyle = document.createElement("style");
    faStyle.textContent = faStyles;
    shadow.appendChild(faStyle);

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

    // VitePress toggles dark mode by adding `.dark` to <html>, which lives in
    // the light DOM outside this shadow boundary. VUEDA's `dark:` variant is
    // selector-scoped (`&:where(.dark, .dark *)`), so it cannot match that
    // ancestor from inside the shadow tree, and every `dark:`-only utility
    // (e.g. `dark:border-input` on outline buttons) silently no-ops while the
    // inherited token values still flip. Mirror the flag onto the shadow
    // container so those variants resolve and the demos match a real app.
    watch(
        isDark,
        (dark) => {
            container.classList.toggle("dark", dark);
        },
        { immediate: true },
    );
});
</script>

<template>
    <div ref="host" class="not-prose">
        <Teleport v-if="shadowTarget" :to="shadowTarget">
            <slot />
        </Teleport>
    </div>
</template>
