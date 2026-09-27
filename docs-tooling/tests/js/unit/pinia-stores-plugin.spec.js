import { load } from "../../../js/typedoc-plugins/pinia-stores.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Application, ReflectionKind, TSConfigReader } from "typedoc";
import { describe, expect, it } from "vitest";

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures/pinia-store");

async function convertFixture() {
    const app = await Application.bootstrap(
        {
            entryPoints: [path.join(fixtureDir, "store.js")],
            tsconfig: path.join(fixtureDir, "tsconfig.json"),
            skipErrorChecking: true,
            logLevel: "Error",
        },
        [new TSConfigReader()],
    );
    load(app);
    return app.convert();
}

function text(comment) {
    return (comment?.summary || []).map((part) => part.text).join("");
}

describe("pinia-stores TypeDoc plugin", () => {
    it("documents state keys, getters, and actions as children of the store", async () => {
        const project = await convertFixture();
        const store = project.getChildByName("storeFixture");
        expect(store).toBeTruthy();

        const count = store.getChildByName("count");
        expect(count.kind).toBe(ReflectionKind.Property);
        expect(text(count.comment)).toBe("How many times `increment` ran.");

        const doubled = store.getChildByName("doubled");
        expect(doubled).toBeTruthy();

        const increment = store.getChildByName("increment");
        expect(increment.kind).toBe(ReflectionKind.Method);
        const signature = increment.signatures[0];
        expect(text(signature.comment)).toBe("Add `step` to the count.");
        expect(signature.parameters.map((parameter) => parameter.name)).toEqual(["step"]);

        // An action listed by name documents the function it names.
        const reset = store.getChildByName("reset");
        expect(reset.kind).toBe(ReflectionKind.Method);
        expect(text(reset.signatures[0].comment)).toBe("Reset the count to zero.");
        expect(reset.signatures[0].parameters).toEqual([]);
    }, 60000);
});
