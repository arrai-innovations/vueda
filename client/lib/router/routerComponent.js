import { reactive } from "vue";

const defaultCrudComponents = {
    list: async () => (await import("@vueda/views/ViewList.vue")).default,
    create: async () => (await import("@vueda/views/ViewCreate.vue")).default,
    update: async () => (await import("@vueda/views/ViewUpdate.vue")).default,
    read: async () => (await import("@vueda/views/ViewRead.vue")).default,
    destroy: async () => (await import("@vueda/views/ViewDelete.vue")).default,
    activate: async () => (await import("@vueda/views/ViewActivate.vue")).default,
    deactivate: async () => (await import("@vueda/views/ViewDeactivate.vue")).default,
};

export const crudComponents = reactive({ ...defaultCrudComponents });

export function setCrudComponents(customComponents) {
    Object.assign(crudComponents, customComponents);
}
