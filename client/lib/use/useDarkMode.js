import { tryOnMounted } from "@vueuse/core";
import { once } from "lodash-es";
import { readonly, ref } from "vue";

const darkModeLocalStorageKey = "darkMode";
const isDarkRef = ref(false);

const prefers = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

function init() {
    const storedDarkMode = localStorage.getItem(darkModeLocalStorageKey);
    // null means key was not set
    const darkModeSet = storedDarkMode !== null;
    isDarkRef.value = darkModeSet ? JSON.parse(storedDarkMode) : prefers();
}
const onceInit = once(init);
window.addEventListener("storage", (event) => {
    if (event.key === "darkMode") {
        if (event.newValue === null) {
            isDarkRef.value = prefers();
        } else {
            isDarkRef.value = JSON.parse(event.newValue);
        }
    }
});

function toggle() {
    isDarkRef.value = isDarkRef.value === null ? true : !isDarkRef.value;
    localStorage.setItem(darkModeLocalStorageKey, JSON.stringify(isDarkRef.value));
}

const isDark = readonly(isDarkRef);

export default function useDarkMode() {
    tryOnMounted(onceInit);
    return {
        isDark,
        toggle,
    };
}
