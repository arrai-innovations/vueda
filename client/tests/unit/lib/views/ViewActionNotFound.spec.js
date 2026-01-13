import { mockProvideInject, mockUseRoute, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

var provideStore, mockedProvide, mockedInject;

const mockedUseRoute = mockUseRoute(vi);
const mockedUseLookupContext = vi.fn();
let modelInfoStore;
let routeRef;

vi.mock("@vueda/use/useLookupContext.js", () => ({
    useLookupContext: mockedUseLookupContext,
}));

vi.mock("@vueda/stores/storeModelInfo", () => ({
    storeModelInfo: () => modelInfoStore,
}));

vi.mock("string-similarity-js", () => ({
    stringSimilarity: (a, b) => {
        let i = 0;
        for (; i < Math.min(a.length, b.length); i++) {
            if (a[i] !== b[i]) {
                break;
            }
        }
        return i;
    },
}));

vi.mock("vue-router", async () => {
    const actual = await vi.importActual("vue-router");
    return {
        __esModule: true,
        ...actual,
        useRoute: mockedUseRoute,
    };
});

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    ({ provideStore, mockedProvide, mockedInject } = mockProvideInject(vi));
    return {
        __esModule: true,
        ...actual,
        inject: mockedInject,
        provide: mockedProvide,
    };
});

let ViewActionNotFound, vue;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    routeRef = vue.ref({ params: { app: "app1", model: "modelA", action: "redit" } });
    mockedUseRoute.mockReturnValue(routeRef.value);
    mockedUseLookupContext.mockClear();
    modelInfoStore = { infos: { app1: { modelA: { actions: ["list", "edit", "read"] } } } };
    ViewActionNotFound = (await import("@vueda/views/ViewActionNotFound.vue")).default;
    provideStore.clear();
    mockedInject.mockReset();
});

scopedIt("calls useLookupContext if lookup context is missing", () => {
    mockedInject.mockReturnValueOnce(null);
    mount(ViewActionNotFound, { global: { stubs: { RouterLink: true } } });
    expect(mockedUseLookupContext).toHaveBeenCalled();
});

scopedIt("does not call useLookupContext when lookup context exists", () => {
    mockedInject.mockReturnValueOnce({});
    mount(ViewActionNotFound, { global: { stubs: { RouterLink: true } } });
    expect(mockedUseLookupContext).not.toHaveBeenCalled();
});

scopedIt("suggests closest actions and updates on route change", async () => {
    mockedInject.mockReturnValueOnce({});
    const wrapper = mount(ViewActionNotFound, { global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } } });

    expect(wrapper.vm.suggestions).toEqual([
        { name: "list", type: "view", path: "/app1/modelA/list", title: "List modelA" },
        { name: "read", type: "action", path: "/app1/modelA/read", title: "read modelA" },
    ]);

    routeRef.value.params.action = "edit";
    await vue.nextTick();

    expect(wrapper.vm.suggestions).toEqual([
        { name: "list", type: "view", path: "/app1/modelA/list", title: "List modelA" },
        { name: "edit", type: "action", path: "/app1/modelA/edit", title: "edit modelA" },
    ]);
});
