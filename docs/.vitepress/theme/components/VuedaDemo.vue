<script setup>
import { onMounted, ref } from "vue";

const host = ref(null);
const shadowTarget = ref(null);

onMounted(() => {
    const shadow = host.value.attachShadow({ mode: "open" });

    // Mirror all document stylesheets into the shadow root so Tailwind
    // utilities and VUEDA tokens apply inside the boundary. We clone by
    // element rather than using adoptedStyleSheets because non-constructed
    // CSSStyleSheet instances (parsed from <link>/<style> elements) cannot
    // be assigned to adoptedStyleSheets in all browsers.
    // <link> sheets are re-referenced by href (browser serves from cache).
    // <style> sheets are cloned by text content.
    // VitePress context-scoped rules (.vp-doc li, etc.) are included but
    // cannot match elements inside the shadow root because their ancestor
    // selectors live outside the boundary. CSS custom properties (:root,
    // .dark) still inherit through normally.
    for (const sheet of document.styleSheets) {
        if (sheet.href) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = sheet.href;
            shadow.appendChild(link);
        } else if (sheet.ownerNode?.tagName === "STYLE") {
            const style = document.createElement("style");
            style.textContent = sheet.ownerNode.textContent;
            shadow.appendChild(style);
        }
    }

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
