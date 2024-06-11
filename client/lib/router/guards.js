import storeToast from "@vueda/stores/storeToast.js";
import storeUser from "@vueda/stores/storeUser.js";
import isEmpty from "lodash-es/isEmpty";

/**
 * Wait for the user to be initialized. This is useful if your making your own
 *  custom guards that need to know if the user is logged in or not.
 *
 * @returns {Promise} The user object.
 */
export async function waitForInitialising() {
    const userStore = storeUser();
    if (!userStore.initialized) {
        await userStore.whoAmI();
    }
    return userStore;
}

/**
 * Require the user to be authenticated.
 *
 * Usage:
 *   ```js
 *   import { requireAuth } from "@vueda/router/guards";
 *   const routes = [
 *     ...,
 *      { // a route that requires authentication
 *        path: '/auth-required/',
 *        name: 'auth-required',
 *        component: () => import('@/views/ViewAuthRequired.vue'),
 *        beforeEnter: requireAuth,
 *      },
 *     ...
 *   ];
 *   const router = createRouter({
 *     history: createWebHistory(import.meta.env.BASE_URL),
 *     routes,
 *   });
 *   export default router;
 *   ```
 *
 * @param {Object} to Where the user is trying to go.
 *
 * @returns {Object} The route object.
 */
export async function requireAuth(to) {
    const userStore = await waitForInitialising();
    if (!userStore.loggedIn) {
        return { name: "log-in", query: { redirect: to.fullPath } };
    }
}

/**
 * Require the user to be unauthenticated, like for a login page.
 *
 * Usage:
 *   ```js
 *   import { requireUnauth } from "@vueda/router/guards";
 *   const routes = [
 *     ...,
 *     { // a route that requires the user to be unauthenticated
 *       path: '/unauth-required/',
 *       name: 'unauth-required',
 *       component: () => import('@/views/ViewUnauthRequired.vue'),
 *       beforeEnter: requireUnauth,
 *     },
 *     ...
 *   ];
 *   const router = createRouter({
 *     history: createWebHistory(import.meta.env.BASE_URL),
 *     routes,
 *   });
 *   export default router;
 *   ```
 *
 * @returns {Object} The route object, if a redirect is needed.
 */
export async function requireUnauth() {
    const userStore = await waitForInitialising();
    if (userStore.loggedIn) {
        return { name: "home" };
    }
}

/**
 * Require the user to be initialized, in order to optionally show or use the
 *  user object, but not requiring authentication.
 *
 * Usage:
 *   ```js
 *   import { requireInitialized } from "@vueda/router/guards";
 *   const routes = [
 *     ...,
 *     { // a route that requires the user to be initialized
 *       path: '/initialized-required/',
 *       name: 'initialized-required',
 *       component: () => import('@/views/ViewInitializedRequired.vue'),
 *       beforeEnter: requireInitialized,
 *     },
 *     ...
 *   ];
 *   const router = createRouter({
 *     history: createWebHistory(import.meta.env.BASE_URL),
 *     routes,
 *   });
 *   export default router;
 *   ```
 *
 * @returns {Promise<void>}
 */
export async function requireInitialized() {
    await waitForInitialising();
}

/**
 * Require the user to have certain groups, or show a toast message for denial.
 *
 * Usage:
 *   ```js
 *   import partial from "lodash-es/partial.js";
 *   import { requirePerms } from "@vueda/router/guards";
 *   const myRequirePerms = partial(
 *       {
 *           title: "Permission Denied",
 *           message: "You do not have permission to access",
 *           variant: "error",
 *           autoDismiss: false,
 *       }
 *   );
 *   const routes = [
 *     ...,
 *     { // a route that requires certain permissions
 *       path: '/groups-required/',
 *       name: 'groups-required',
 *       component: () => import('@/views/ViewPermsRequired.vue'),
 *       beforeEnter: partial(requirePerms, ["group1", "group2"]),
 *     },
 *     ...
 *    ];
 *    const router = createRouter({
 *      history: createWebHistory(import.meta.env.BASE_URL),
 *      routes,
 *    });
 *    export default router;
 *    ```
 *
 * @param {Object} toastArgs - The arguments for the denial toast message.
 *  toastArgs.message will have the denied url appended. See storeToast for more details.
 * @param {Array<string>} groups - The groups the user must have ONE of.
 * @param to - Where the user is trying to go.
 * @returns {Promise<boolean>}
 */
export async function requireGroups(toastArgs, groups, to) {
    const userStore = await waitForInitialising();
    const toastStore = storeToast();
    if (isEmpty(groups)) {
        return true;
    }
    if (groups.some((group) => userStore.loggedInUser?.groups?.includes(group))) {
        return true;
    }
    toastStore.addToast({
        ...toastArgs,
        message: `${toastArgs.message} ${to.fullPath}`,
    });
}
