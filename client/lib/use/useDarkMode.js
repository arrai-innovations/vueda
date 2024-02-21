import { inject, onMounted, provide, readonly, ref } from "vue";

const darkModeLocalStorageKey = "darkMode";

const prefers = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

const DarkModeSymbol = Symbol();

export default function useDarkMode() {
    let darkMode = inject(DarkModeSymbol, null);

    if (darkMode === null) {
        // Dark mode hasn't been provided yet, so initialize and provide it here.
        const isDarkRef = ref(false);

        onMounted(() => {
            const storedDarkMode = localStorage.getItem(darkModeLocalStorageKey);
            // null means key was not set
            isDarkRef.value = storedDarkMode !== null ? JSON.parse(storedDarkMode) : prefers();
        });

        window.addEventListener("storage", (event) => {
            if (event.key === "darkMode") {
                if (event.newValue === null) {
                    isDarkRef.value = prefers();
                } else {
                    isDarkRef.value = JSON.parse(event.newValue);
                }
            }
        });

        const toggle = () => {
            isDarkRef.value = !isDarkRef.value;
            localStorage.setItem(darkModeLocalStorageKey, JSON.stringify(isDarkRef.value));
        };

        darkMode = { isDark: readonly(isDarkRef), toggle };
        provide(DarkModeSymbol, darkMode);
    }

    return darkMode;
}
