import { mockUseRoute } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";
import { ref } from "vue";

const mockedUseRoute = mockUseRoute(vi);
vi.mock("vue-router", async () => {
    const original = await vi.importActual("vue-router");
    return {
        __esModule: true,
        ...original,
        useRoute: mockedUseRoute,
    };
});

describe("lib/use/useRouteProps.js", () => {
    let routeRef, useRouteProps;

    beforeEach(async () => {
        useRouteProps = await vi.importActual("@vueda/use/useRouteProps.js").then((m) => m.useRouteProps);
        routeRef = ref({
            matched: [
                {
                    props: {
                        default: { someProp: "initialValue" },
                    },
                },
            ],
        });
        mockedUseRoute.mockImplementation(() => routeRef.value);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should return the props.default object when not a function", async () => {
        const result = useRouteProps();
        expect(result.value).toEqual({ someProp: "initialValue" });

        // Simulate route change
        routeRef.value.matched[0].props.default = { someProp: "newValue" };
        await flushPromises();
        expect(result.value).toEqual({ someProp: "newValue" });
    });

    it("should call props.default(route) if it is a function", async () => {
        const propsFn = vi.fn((route) => ({ derived: route.matched[0].props.meta }));
        routeRef.value.matched[0].props = {
            default: propsFn,
            meta: "someMetaInfo",
        };

        const result = useRouteProps();
        expect(result.value).toEqual({ derived: "someMetaInfo" });
        expect(propsFn).toHaveBeenCalledWith(routeRef.value);
    });

    it("should return undefined when route.matched is empty", async () => {
        routeRef.value.matched = [];
        const result = useRouteProps();
        expect(result.value).toBeUndefined();
    });

    it("should return undefined when route.matched[0] or .props is missing", async () => {
        routeRef.value.matched = [null];
        const result1 = useRouteProps();
        expect(result1.value).toBeUndefined();

        routeRef.value.matched = [{ props: null }];
        const result2 = useRouteProps();
        expect(result2.value).toBeUndefined();
    });
});
