import { scopedIt, withSetup } from "@tests/unit/utils.js";
import { useModelAction } from "@vueda/use/useModelAction.js";
import { DETAIL_VIEW_CRUD_NAME, LIST_VIEW_CRUD_NAME } from "@vueda/utils/constants.js";
import { ConfirmationRequiredError, FetchError, FormValidationError } from "@vueda/utils/errors.js";
import { reactive } from "vue";

const mocks = vi.hoisted(() => {
    const modelConfig = {
        info: { verboseName: "person", verboseNamePlural: "people" },
        config: { actionRedirects: { default: "detail" } },
    };
    const getListUrl = vi.fn(({ action }) => `/list/${action || ""}`);
    const getDetailUrl = vi.fn(({ pk, action }) => `/detail/${pk}/${action || ""}`);
    const getCSRFValue = vi.fn(() => "csrf-token");
    const fetchHelper = vi.fn((url, options, message, errorResolver) => {
        if (fetchHelper.shouldReject) {
            const response = fetchHelper.response || new Response(null, { status: 500 });
            return Promise.reject(errorResolver(message, response, fetchHelper.responseData));
        }
        return Promise.resolve(fetchHelper.responseData);
    });
    const routerPush = vi.fn();
    return { modelConfig, getListUrl, getDetailUrl, getCSRFValue, fetchHelper, routerPush, routeQuery: {} };
});

const { modelConfig, getListUrl, getDetailUrl, getCSRFValue, fetchHelper, routerPush } = mocks;
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig: () => mocks.modelConfig }));
vi.mock("@vueda/utils/urls.js", () => ({ getListUrl: mocks.getListUrl, getDetailUrl: mocks.getDetailUrl }));
vi.mock("@vueda/utils/csrf.js", () => ({ getCSRFValue: mocks.getCSRFValue }));
vi.mock("@vueda/utils/fetchSupport.js", () => ({ fetchHelper: mocks.fetchHelper }));
vi.mock("vue-router", () => ({
    useRouter: () => ({ push: mocks.routerPush }),
    useRoute: () => ({ query: mocks.routeQuery }),
}));

function createFetchState(objectsInOrder = [{ id: 1 }, { id: 2 }]) {
    return {
        objectsInOrder,
        objectsMap: new Map(objectsInOrder.map((obj) => [String(obj.id), obj])),
    };
}

describe("lib/use/useModelAction.js", () => {
    beforeEach(() => {
        modelConfig.info = { verboseName: "person", verboseNamePlural: "people" };
        modelConfig.config = { actionRedirects: { default: "detail" } };
        getListUrl.mockClear();
        getDetailUrl.mockClear();
        getCSRFValue.mockClear();
        fetchHelper.mockClear();
        fetchHelper.shouldReject = false;
        fetchHelper.response = undefined;
        fetchHelper.responseData = undefined;
        routerPush.mockClear();
        mocks.routeQuery = {};
    });

    scopedIt("derives target state from fetchState and falls back to pk", async () => {
        const fromFetchState = await withSetup(() =>
            useModelAction(
                reactive({
                    app: "app",
                    model: "person",
                    action: "archive",
                    pk: ["fallback"],
                    fetchState: createFetchState([{ id: 4 }, { id: 7 }]),
                }),
            ),
        );
        expect(fromFetchState.state.pks.value).toEqual([4, 7]);
        expect(fromFetchState.state.pksAsString.value).toEqual(["4", "7"]);
        expect(fromFetchState.state.bulk.value).toBe(true);
        expect(fromFetchState.state.pkCount.value).toBe(2);

        const fromPk = await withSetup(() =>
            useModelAction(reactive({ app: "app", model: "person", action: "archive", pk: "9" })),
        );
        expect(fromPk.state.pks.value).toEqual(["9"]);
        expect(fromPk.state.pksAsString.value).toEqual(["9"]);
        expect(fromPk.state.bulk.value).toBe(false);
    });

    scopedIt("builds and runs a bulk action request", async () => {
        fetchHelper.responseData = { ok: true };
        const transformSubmitDataFn = vi.fn(() => ({ reason: "stale" }));
        const modelAction = await withSetup(() =>
            useModelAction(
                reactive({
                    app: "app",
                    model: "person",
                    action: "archive",
                    requestMethod: "PATCH",
                    fetchState: createFetchState([{ id: 4 }, { id: 7 }]),
                    transformSubmitDataFn,
                }),
            ),
        );

        await modelAction.runAction({ formValues: { raw: true }, dryRun: true, acknowledgeWarnings: "d1" });

        expect(getListUrl).toHaveBeenCalledWith({ app: "app", model: "person", action: "archive" });
        expect(fetchHelper).toHaveBeenCalledWith(
            "/list/archive",
            expect.objectContaining({ method: "PATCH" }),
            "Failed to execute action",
            expect.any(Function),
        );
        const options = fetchHelper.mock.calls[0][1];
        expect(options.headers).toMatchObject({
            "X-CSRFToken": "csrf-token",
            "Content-Type": "application/json",
            "Dry-Run": "true",
            "Acknowledge-Warnings": "d1",
        });
        expect(JSON.parse(options.body)).toEqual({ pks: [4, 7], reason: "stale" });
        expect(transformSubmitDataFn).toHaveBeenCalledWith({ raw: true });
    });

    scopedIt("builds a detail destroy request without routing through bulkDelete", async () => {
        const modelAction = await withSetup(() =>
            useModelAction(reactive({ app: "app", model: "person", action: "destroy", pk: "9" })),
        );

        const request = modelAction.buildRequest();

        expect(getDetailUrl).toHaveBeenCalledWith({ app: "app", model: "person", pk: "9", action: "destroy" });
        expect(request).toMatchObject({
            url: "/detail/9/destroy",
            options: { method: "DELETE", body: undefined },
        });
    });

    scopedIt("maps validation, confirmation, and generic failures", async () => {
        const modelAction = await withSetup(() =>
            useModelAction(reactive({ app: "app", model: "person", action: "archive", pk: "9" })),
        );

        fetchHelper.shouldReject = true;
        fetchHelper.response = new Response(null, { status: 400 });
        fetchHelper.responseData = { name: ["Required."] };
        await expect(modelAction.runAction()).rejects.toBeInstanceOf(FormValidationError);

        fetchHelper.response = new Response(null, { status: 409 });
        fetchHelper.responseData = { confirmation_required: true, digest: "d1", warnings: { count: ["unusual"] } };
        await expect(modelAction.runAction()).rejects.toBeInstanceOf(ConfirmationRequiredError);

        fetchHelper.response = new Response(null, { status: 500 });
        fetchHelper.responseData = { detail: "nope" };
        await expect(modelAction.runAction()).rejects.toBeInstanceOf(FetchError);
    });

    scopedIt("redirects through returnPath, list, and detail targets", async () => {
        mocks.routeQuery = { returnPath: "/back" };
        const returnPathAction = await withSetup(() =>
            useModelAction(reactive({ app: "app", model: "person", action: "archive", pk: "9" })),
        );
        await returnPathAction.redirectTo("success");
        expect(routerPush).toHaveBeenLastCalledWith("/back");

        mocks.routeQuery = {};
        const detailAction = await withSetup(() =>
            useModelAction(reactive({ app: "app", model: "person", action: "archive", pk: "9" })),
        );
        await detailAction.redirectTo("success");
        expect(routerPush).toHaveBeenLastCalledWith({
            name: DETAIL_VIEW_CRUD_NAME,
            params: { app: "app", model: "person", action: "detail", pk: "9" },
        });

        const bulkAction = await withSetup(() =>
            useModelAction(reactive({ app: "app", model: "person", action: "archive", pk: ["4", "7"] })),
        );
        await bulkAction.redirectTo("success");
        expect(routerPush).toHaveBeenLastCalledWith({
            name: LIST_VIEW_CRUD_NAME,
            params: { app: "app", model: "person", action: "list" },
        });
    });
});
