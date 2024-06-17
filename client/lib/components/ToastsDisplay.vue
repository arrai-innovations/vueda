<script setup>
import ToastDisplay from "@vueda/components/ToastDisplay.vue";
import storeToast from "@vueda/stores/storeToast.js";
import useCombinedClasses from "@vueda/use/useCombinedClasses.js";

const props = defineProps({
    variant: {
        type: String,
        default: "default",
    },
    outerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
});

const toastStore = storeToast();
const combinedToastsClasses = useCombinedClasses("@vueda/components/ToastsDisplay.vue", props);
</script>

<template>
    <div v-if="toastStore.toasts.length" :class="combinedToastsClasses.outerClass">
        <ul :class="combinedToastsClasses.listClass" data-qa="toasts">
            <li v-for="toast in toastStore.toasts" :key="toast.id" :class="combinedToastsClasses.itemClass">
                <!--suppress RequiredAttributes -->
                <toast-display v-bind="toast">
                    <template v-for="slot in Object.keys($slots)" #[slot]="slotProps">
                        <slot :name="slot" v-bind="slotProps" />
                    </template>
                </toast-display>
            </li>
        </ul>
    </div>
</template>
