import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";

vi.mock("@vueda/use/useModelConfig", () => ({
    useModelConfig: vi.fn(() => ({
        config: {
            actionDetails: {
                detail: { detail: true },
                bulk: { bulk: true },
            },
        },
    })),
}));

vi.mock("@vueda/use/useWorkflowTransitions", () => ({
    useWorkflowTransitions: vi.fn(() => ({
        transitions: [{ name: "approve" }],
    })),
}));

vi.mock("@vueda/utils/actionMap", () => ({
    getActionName: vi.fn((view) => view), // identity for test purposes
}));

vi.mock("@vueda/router/getCrud", () => ({
    getCRUDForTo: vi.fn(async ({ view }) => ({
        name: `route-${view}`,
        href: `/app/model/${view}`,
    })),
}));

const push = vi.fn();
const hasRoute = vi.fn(() => true);
const resolve = vi.fn((to) => to);
vi.mock("vue-router", async () => {
    const actual = await vi.importActual("vue-router");
    return {
        ...actual,
        useRouter: () => ({ push, hasRoute, resolve }),
    };
});

describe("lib/use/useLinkModelView.js", () => {
    let useLinkModelView, vue;

    beforeEach(async () => {
        useLinkModelView = (await import("@vueda/use/useLinkModelView.js")).useLinkModelView;
        vue = await import("vue");
    });
    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("generates href and allows navigation when PK is valid", async () => {
        const props = vue.ref({
            app: "foo",
            model: "bar",
            pk: "123",
            view: "detail",
        });

        const { href, navigate, actionDisabled } = useLinkModelView(props.value);
        await flushPromises();

        expect(href.value).toBe("/app/model/detail");
        expect(actionDisabled.value).toBe(false);

        await navigate();
        expect(push).toHaveBeenCalledWith({ name: "route-detail", href: "/app/model/detail" });
    });

    scopedIt("disables action if PK is required but missing", async () => {
        const props = vue.ref({
            app: "foo",
            model: "bar",
            pk: undefined,
            view: "detail",
        });

        const { href, actionDisabled } = useLinkModelView(props.value);
        await flushPromises();

        expect(href.value).toBeUndefined();
        expect(actionDisabled.value).toBe(true);
    });

    scopedIt("disables action if PK is an empty array", async () => {
        const props = vue.ref({
            app: "foo",
            model: "bar",
            pk: [],
            view: "bulk",
        });

        const { actionDisabled } = useLinkModelView(props.value);
        await flushPromises();

        expect(actionDisabled.value).toBe(true);
    });

    scopedIt("returns undefined href if router doesn't recognize route", async () => {
        hasRoute.mockReturnValueOnce(false);

        const props = vue.ref({
            app: "foo",
            model: "bar",
            pk: "123",
            view: "detail",
        });

        const { href } = useLinkModelView(props.value);
        await flushPromises();

        expect(href.value).toBeUndefined();
    });

    scopedIt("does nothing when navigate called and route is undefined", async () => {
        hasRoute.mockReturnValueOnce(false);
        const props = vue.ref({
            app: "foo",
            model: "bar",
            pk: "123",
            view: "detail",
        });

        const { navigate } = useLinkModelView(props.value);
        await navigate();

        expect(push).not.toHaveBeenCalled();
    });
    scopedIt("does not require PK when actionDetails is missing and transitions don't match", async () => {
        vi.doMock("@vueda/use/useModelConfig", () => ({
            useModelConfig: vi.fn(() => ({
                config: {
                    // no actionDetails defined
                },
            })),
        }));
        const props = vue.ref({
            app: "foo",
            model: "bar",
            pk: undefined,
            view: "noPkRequired",
        });

        const { href, actionDisabled } = useLinkModelView(props.value);
        await flushPromises();

        expect(href.value).toBe("/app/model/noPkRequired");
        expect(actionDisabled.value).toBe(false); // PK not required
    });

    scopedIt("does not require PK when actionDetails is empty and transitions don't match", async () => {
        const props = vue.ref({
            app: "foo",
            model: "bar",
            pk: undefined,
            view: "noop",
        });

        const { actionDisabled } = useLinkModelView(props.value);
        await flushPromises();

        expect(actionDisabled.value).toBe(false); // no PK required = not disabled
    });

    scopedIt("disables action when PK is required but not provided", async () => {
        const props = vue.ref({
            app: "foo",
            model: "bar",
            // pk is intentionally omitted
            view: "detail",
        });

        const { actionDisabled } = useLinkModelView(props.value);
        await flushPromises();

        expect(actionDisabled.value).toBe(true); // PK required but missing
    });
    scopedIt("falls back to empty object when actionDetails is undefined", async () => {
        vi.doMock("@vueda/use/useModelConfig", () => ({
            useModelConfig: vi.fn(() => ({
                config: {}, // actionDetails missing
            })),
        }));

        vi.resetModules();
        const { useLinkModelView } = await import("@vueda/use/useLinkModelView.js");
        const vue = await import("vue");

        const props = vue.ref({
            app: "foo",
            model: "bar",
            pk: undefined,
            view: "noPkRequired",
        });

        const { actionDisabled } = useLinkModelView(props.value);
        await flushPromises();

        expect(actionDisabled.value).toBe(false);
    });
    scopedIt("falls back to empty array when workflow.transitions is undefined", async () => {
        vi.doMock("@vueda/use/useWorkflowTransitions", () => ({
            useWorkflowTransitions: vi.fn(() => ({})), // no transitions key
        }));

        vi.resetModules();
        const { useLinkModelView } = await import("@vueda/use/useLinkModelView.js");
        const vue = await import("vue");

        const props = vue.ref({
            app: "foo",
            model: "bar",
            pk: undefined,
            view: "noPkRequired",
        });

        const { actionDisabled } = useLinkModelView(props.value);
        await flushPromises();

        expect(actionDisabled.value).toBe(false);
    });
    scopedIt("disables action when props.disabled is true", async () => {
        const props = vue.ref({
            app: "foo",
            model: "bar",
            pk: "123", // valid
            view: "detail",
            disabled: true, // the key bit
        });

        const { actionDisabled } = useLinkModelView(props.value);
        await flushPromises();

        expect(actionDisabled.value).toBe(true);
    });
});
