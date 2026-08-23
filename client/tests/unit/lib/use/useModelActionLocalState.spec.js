import { useListInstance } from "@arrai-innovations/reactive-helpers";
import { scopedIt, withSetup } from "@tests/unit/utils.js";
import { useModelAction } from "@vueda/use/useModelAction.js";
import { setupDefaultListCrud } from "@vueda/utils/listCrud.js";
import { reactive } from "vue";

/**
 * Covers what a model action leaves behind in the list it ran through, which is the half
 * `useModelAction.spec.js` cannot see.
 *
 * That spec asserts the arguments handed to reactive-helpers (`keepObjects` on a dry run, `pks`
 * on a real destroy) against instance stubs. Arguments are not outcomes: reactive-helpers 24.0.0
 * accepts every one of them while its `bulkDelete` ignores `keepObjects` and empties the whole
 * list whatever `pks` says, which is the bug the pre-flight was meant to fix. These tests use a
 * real instance and vueda's registered adaptors, with `fetch` as the only seam.
 *
 * Like the rest of the model-action path they require reactive-helpers >= 24.1.0. Against an
 * older copy both fail with an emptied list.
 */

const modelConfig = {
    info: { pk: "id", verboseName: "customer", verboseNamePlural: "customers" },
    config: { actionRedirects: { default: "update" } },
};
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig: () => modelConfig }));
vi.mock("vue-router", () => ({
    useRouter: () => ({ push: vi.fn() }),
    useRoute: () => ({ query: {} }),
}));

/**
 * Seed a real list instance with rows, as a loaded list would hold them.
 *
 * @param {object[]} objects - Rows to push.
 * @returns {Promise<object>} The list instance.
 */
async function seededList(objects) {
    const instanceList = await withSetup(() =>
        useListInstance({
            props: reactive({ target: { app: "showcase", model: "customer" }, pkKey: "id", params: {} }),
        }),
    );
    instanceList.pushObjects(objects);
    return instanceList;
}

/**
 * Build the destroy action over a caller-supplied list.
 *
 * @param {object} instanceList - The list the action reconciles.
 * @param {(string|number)[]} pk - Primary keys the action targets.
 * @returns {Promise<object>} The `useModelAction` context.
 */
function destroyAction(instanceList, pk) {
    return withSetup(() =>
        useModelAction(reactive({ app: "showcase", model: "customer", action: "destroy", pk, instanceList })),
    );
}

/**
 * @param {object} instanceList - The list to read.
 * @returns {(string|number)[]} The primary keys the list still holds.
 */
const remainingPks = (instanceList) => instanceList.state.objectsInOrder.map((object) => object.id);

describe("lib/use/useModelAction.js local state", () => {
    beforeEach(() => {
        setupDefaultListCrud();
        // The server answers a valid dry run 200 and a real bulk delete 204.
        global.fetch = vi.fn((url, options) =>
            Promise.resolve(new Response(null, { status: options?.headers?.["Dry-Run"] === "true" ? 200 : 204 })),
        );
    });

    describe("Bulk destroy", () => {
        scopedIt("leaves every row in place through the dry-run pre-flight", async () => {
            const instanceList = await seededList([{ id: 4 }, { id: 11 }, { id: 23 }]);
            const action = await destroyAction(instanceList, [4, 11, 23]);

            await action.runAction({ dryRun: true });

            // The operator is still confirming against these rows; a validation pass must not
            // empty the list under them.
            expect(remainingPks(instanceList)).toEqual([4, 11, 23]);
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        scopedIt("removes only the rows it targeted", async () => {
            const instanceList = await seededList([{ id: 4 }, { id: 11 }, { id: 23 }]);
            const action = await destroyAction(instanceList, [4, 11]);

            await action.runAction({});

            expect(remainingPks(instanceList)).toEqual([23]);
        });
    });
});
