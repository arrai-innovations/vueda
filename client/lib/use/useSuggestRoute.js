import { stringSimilarity } from "string-similarity-js";
import { onActivated, readonly, ref } from "vue";
import { useRouter } from "vue-router";

const buildDynamicRoutePaths = (models, actions) => {
    const paths = [];
    for (const [modelKey, modelData] of Object.entries(models.data)) {
        for (const actionKey of modelData.actions) {
            paths.push(`/${modelData.app}/${modelKey}/:pk/${actionKey}`);
        }
    }
    return paths;
};

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

const normalizePathForMatching = (path) => {
    return path.replace(/\/[0-9]+/g, "/:pk");
};

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

const getSuggestedRoute = (router) => {
    const currentPath = router.currentRoute.value.path;
    const normalizedPath = normalizePathForMatching(currentPath);
    const allRoutes = getAllRoutePaths(router.options.routes);
    const bestMatch = getBestMatch(normalizedPath, allRoutes);
    return buildRouteObject(bestMatch, currentPath);
};

export default function useSuggestRoute() {
    const suggestedRoute = ref(null);
    const router = useRouter();
    const models = useModels();
    const actions = useActions();

    onActivated(() => {
        suggestedRoute.value = getSuggestedRoute(router);
    });
    return readonly(suggestedRoute);
}
