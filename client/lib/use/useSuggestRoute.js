/**
 * @module use/useSuggestRoute
 * @description Suggests the best matching route for the current path using string similarity against all registered routes.
 */
import { stringSimilarity } from "string-similarity-js";
import { onActivated, readonly, ref } from "vue";
import { useRouter } from "vue-router";

// const buildDynamicRoutePaths = (models, actions) => {
//     const paths = [];
//     for (const [modelKey, modelData] of Object.entries(models.data)) {
//         for (const actionKey of modelData.actions) {
//             paths.push(`/${modelData.app}/${modelKey}/:pk/${actionKey}`);
//         }
//     }
//     return paths;
// };

/**
 * Builds a route object from a path and the current path.
 *
 * @param {string} path - The path to build a route object from.
 * @param {string} currentPath - The current path.
 * @returns {object} A route object.
 */
const buildRouteObject = (path, currentPath) => {
    const params = {};
    const pathParts = path.split("/");
    const currentPathParts = currentPath.split("/");
    pathParts.forEach((part, index) => {
        if (part.startsWith(":")) {
            const paramName = part.slice(1);
            params[paramName] = currentPathParts[index];
        }
    });
    return {
        name: path,
        params,
    };
};

/**
 * Gets the best match for a path from an array of paths.
 *
 * @param {string} path - The path to match.
 * @param {string[]} allPaths - The paths to match against.
 * @returns {string} The best match for the path.
 */
const getBestMatch = (path, allPaths) => {
    const scores = allPaths.map((x) => stringSimilarity(path, x));
    const bestMatch = scores.reduce(
        (acc, score, index) => {
            if (score > acc.score) {
                acc.score = score;
                acc.index = index;
            }
            return acc;
        },
        { score: 0, index: -1 },
    );
    return allPaths[bestMatch.index];
};

/**
 * @typedef {{ matchedPath: string, score: number }} RouteMatch
 */

/**
 * Returns up to `limit` route paths sorted by descending similarity score,
 * filtering out zero-score results.
 *
 * @param {string} path - Normalized path to match.
 * @param {string[]} allPaths - Candidate route paths.
 * @param {number} limit - Maximum number of results.
 * @returns {RouteMatch[]}
 */
const getNBestMatches = (path, allPaths, limit) =>
    allPaths
        .map((matchedPath) => ({ matchedPath, score: stringSimilarity(path, matchedPath) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

/**
 * Normalizes a path for matching.
 *
 * @param {string} path - The path to normalize.
 * @returns {string} The normalized path.
 */
const normalizePathForMatching = (path) => {
    return path.replace(/\/[0-9]+/g, "/:pk");
};

/**
 * Gets all route paths from a routes object.
 *
 * @param {object[]} routes - The routes object.
 * @returns {string[]} An array of route paths.
 */
const getAllRoutePaths = (routes) => {
    return routes.reduce((acc, route) => {
        if (route.path) {
            acc.push(route.path);
        }
        if (route.children) {
            acc.push(...getAllRoutePaths(route.children));
        }
        return acc;
    }, []);
};

/**
 * Gets a suggested route based on the current route.
 *
 * @param {object} router - The router object.
 * @returns {{
 *     name: string,
 *     params: object,
 * }} A suggested route object.
 */
const getSuggestedRoute = (router) => {
    const currentPath = router.currentRoute.value.path;
    const normalizedPath = normalizePathForMatching(currentPath);
    const allRoutes = getAllRoutePaths(router.options.routes);
    const bestMatch = getBestMatch(normalizedPath, allRoutes);
    return buildRouteObject(bestMatch, currentPath);
};

/**
 * A hook to suggest a route based on the current route.
 *
 * @returns {Readonly<import('vue').Ref<object|null>>} A suggested route object.
 */
export function useSuggestRoute() {
    const suggestedRoute = ref(null);
    const router = useRouter();
    // const models = useModels();
    // const actions = useActions();

    onActivated(() => {
        suggestedRoute.value = getSuggestedRoute(router);
    });
    return readonly(suggestedRoute);
}

/**
 * @typedef {{ route: { name: string, params: object }, score: number, matchedPath: string }} SuggestedRoute
 */

/**
 * A hook that returns the N best matching routes for the current path with
 * similarity scores. Intended for use with `SuggestionList` in system 404 views.
 *
 * @param {object} [options]
 * @param {number} [options.limit=5] - Maximum number of suggestions to return.
 * @returns {Readonly<import('vue').Ref<SuggestedRoute[]>>}
 */
export function useSuggestRoutes({ limit = 5 } = {}) {
    const suggestions = ref([]);
    const router = useRouter();

    onActivated(() => {
        const currentPath = router.currentRoute.value.path;
        const normalizedPath = normalizePathForMatching(currentPath);
        const allRoutes = getAllRoutePaths(router.options.routes);
        suggestions.value = getNBestMatches(normalizedPath, allRoutes, limit).map(({ matchedPath, score }) => ({
            route: buildRouteObject(matchedPath, currentPath),
            score,
            matchedPath,
        }));
    });

    return readonly(suggestions);
}
