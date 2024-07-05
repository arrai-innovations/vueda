import { useLoadingError } from "@arrai-innovations/reactive-helpers";
import storeModelConfig from "@vueda/stores/storeModelConfig";
import storeModelInfo from "@vueda/stores/storeModelInfo";
import { computed, reactive, watch } from "vue";

/**
 * A navigation item.
 *
 * @typedef {object} NavigationItem
 * @property {string} name - The name of the navigation item.
 * @property {string|null} link - The link for the navigation item.
 * @property {NavigationItem[]} children - The children of the navigation item.
 */

/**
 * The raw instance of the navigation data.
 *
 * @typedef {object} NavigationRawInstance
 * @property {Readonly<import('vue').Ref<boolean|undefined>>} loading - Whether the navigation data is loading.
 * @property {Readonly<import('vue').Ref<Error|null>>} error - The error that occurred while loading the navigation data.
 * @property {Readonly<import('vue').Ref<boolean>>} errored - Whether an error occurred while loading the navigation
 * @property {NavigationItem[]} navigation - The navigation data.
 */

/**
 * The instance of the navigation data.
 *
 * @typedef {import('vue').UnwrapNestedRefs<NavigationRawInstance>} NavigationInstance
 */

/**
 * The user configuration for the navigation.
 *
 * @typedef {object} UserConfig
 * @property {object[]} apps - The apps to build navigation for.
 * @property {string} apps[].name - The app name.
 * @property {string} apps[].link - The app link.
 * @property {object[]} apps[].models - The models for the app.
 * @property {string} apps[].models[].name - The model name.
 * @property {string} apps[].models[].link - The model link.
 * @property {string[]} apps[].models[].actions - The model actions.
 * @property {object[]} customRoutes - Custom routes to add to the navigation.
 * @property {string} customRoutes[].name - The custom route name.
 * @property {string} customRoutes[].link - The custom route link.
 */

/**
 * Composition function to provide navigation data for a given configuration.
 *
 * @param {import('vue').UnwrapNestedRefs<UserConfig>} userConfig - The user configuration.
 * @returns {NavigationInstance} - An object containing reactive navigation data.
 */
export default function useNavigation(userConfig) {
    const modelConfigStore = storeModelConfig();
    const modelInfoStore = storeModelInfo();

    const loadingError = useLoadingError();
    const navigationData = reactive(
        /** @type {NavigationRawInstance} */ {
            loading: loadingError.loading,
            error: loadingError.error,
            errored: loadingError.errored,
            navigation: [],
        },
    );

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

    /**
     * Builds the navigation data based on the user configuration.
     *
     * @param {object} config - The user configuration.
     * @property {object[]} config.apps - The apps to build navigation for.
     * @property {string} config.apps[].name - The app name.
     * @property {string} config.apps[].link - The app link.
     * @property {object[]} config.apps[].models - The models for the app.
     * @property {string} config.apps[].models[].name - The model name.
     * @property {string} config.apps[].models[].link - The model link.
     * @property {string[]} config.apps[].models[].actions - The model actions.
     * @returns {object[]} The navigation data.
     * @private
     */
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

    return navigationData;
}
