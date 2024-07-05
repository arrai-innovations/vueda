import storeModelConfig from "@vueda/stores/storeModelConfig";
import storeModelInfo from "@vueda/stores/storeModelInfo";
import { computed, reactive, watch } from "vue";

/**
 * Composition function to provide navigation data for a given configuration.
 *
 * @param {object} userConfig - User configuration for navigation.
 * @returns {object} - An object containing reactive navigation data.
 */
export default function useNavigation(userConfig) {
    const modelConfigStore = storeModelConfig();
    const modelInfoStore = storeModelInfo();

    const navigationData = reactive({
        loading: true,
        error: null,
        navigation: [],
    });

    const fetchModelData = async (app, model) => {
        try {
            const modelInfo = await modelInfoStore.fetchModelInfo(app, model);
            const modelConfig = await modelConfigStore.getConfig(app, model);
            return { modelInfo, modelConfig };
        } catch (e) {
            console.error(`Error fetching model data for ${app}.${model}:`, e);
            return null;
        }
    };

    const buildNavigation = async (config) => {
        const navItems = [];

        for (const appConfig of config.apps) {
            const appNav = {
                name: appConfig.name,
                link: appConfig.link || null,
                children: [],
            };

            for (const modelConfig of appConfig.models) {
                const modelData = await fetchModelData(appConfig.name, modelConfig.name);
                if (modelData) {
                    const modelNav = {
                        name: modelConfig.name,
                        link: modelConfig.link || null,
                        actions: modelConfig.actions.map((action) => ({
                            name: action,
                            link: modelConfig.link ? `${modelConfig.link}/${action}` : null,
                        })),
                    };
                    appNav.children.push(modelNav);
                }
            }

            navItems.push(appNav);
        }

        return navItems;
    };

    const customRoutes = computed(() => {
        return userConfig.customRoutes.map((route) => ({
            name: route.name,
            link: route.link,
        }));
    });

    watch(
        () => userConfig,
        async (newConfig) => {
            navigationData.loading = true;
            try {
                const navItems = await buildNavigation(newConfig);
                navigationData.navigation = [...navItems, ...customRoutes.value];
                navigationData.error = null;
            } catch (e) {
                navigationData.error = e;
            } finally {
                navigationData.loading = false;
            }
        },
        { immediate: true },
    );

    return {
        ...navigationData,
    };
}
