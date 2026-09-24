import {
    buildComponentIndex,
    scanClientSymbols,
    validateClientSymbols,
} from "../../../js/validators/client-symbols.js";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("scanClientSymbols", () => {
    it("collects @vueda specifiers with their line numbers", () => {
        const content = ['import FormField from "@vueda/form/form-model/FormField.vue";', "", "text"].join("\n");
        expect(scanClientSymbols(content)).toEqual([
            { type: "specifier", value: "form/form-model/FormField.vue", line: 1 },
        ]);
    });

    it("skips a specifier written with a placeholder segment", () => {
        const content = 'see `"@vueda/theme/vueda-tailwind/<family>/index.js"` for the family entry point';
        expect(scanClientSymbols(content)).toEqual([]);
    });

    it("collects widget names from inline code and from Vue elements", () => {
        const content = ["The `WidgetTextInput` widget.", '<WidgetCombobox :required="true" />'].join("\n");
        expect(scanClientSymbols(content)).toEqual([
            { type: "widget", value: "WidgetTextInput", line: 1 },
            { type: "widget", value: "WidgetCombobox", line: 2 },
        ]);
    });

    it("collects only the widget name when code spans sit side by side", () => {
        expect(scanClientSymbols("use `FormField`/`WidgetTextInput` together")).toEqual([
            { type: "widget", value: "WidgetTextInput", line: 1 },
        ]);
    });
});

describe("validateClientSymbols", () => {
    let tempDir;
    let clientLibDir;
    let docsDir;

    const docFile = async (name, content) => {
        const filePath = path.join(docsDir, name);
        await writeFile(filePath, content);
        return filePath;
    };

    beforeEach(async () => {
        tempDir = await mkdtemp(path.join(tmpdir(), "client-symbols-"));
        clientLibDir = path.join(tempDir, "client", "lib");
        docsDir = path.join(tempDir, "docs");
        await mkdir(path.join(clientLibDir, "widgets"), { recursive: true });
        await mkdir(docsDir, { recursive: true });
        await writeFile(path.join(clientLibDir, "widgets", "WidgetTextInput.vue"), "<template />");
        await writeFile(path.join(clientLibDir, "widgets", "WidgetCombobox.vue"), "<template />");
    });

    afterEach(async () => {
        await rm(tempDir, { recursive: true, force: true });
    });

    it("accepts a file whose symbols all resolve", async () => {
        const file = await docFile(
            "good.md",
            ['import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";', "The `WidgetCombobox` widget."].join(
                "\n",
            ),
        );
        const { errors, componentCount } = validateClientSymbols({ files: [file], clientLibDir });
        expect(errors).toEqual([]);
        expect(componentCount).toBe(2);
    });

    it("reports an import path with no file behind it", async () => {
        const file = await docFile("bad-import.md", 'import WidgetInput from "@vueda/widgets/WidgetInput.vue";');
        const { errors } = validateClientSymbols({ files: [file], clientLibDir });
        expect(errors).toEqual([{ file, line: 1, message: 'Unresolved import "@vueda/widgets/WidgetInput.vue"' }]);
    });

    it("reports a widget name no component defines", async () => {
        const file = await docFile("bad-name.md", ["", "Use the `WidgetInput` widget."].join("\n"));
        const { errors } = validateClientSymbols({ files: [file], clientLibDir });
        expect(errors).toEqual([{ file, line: 2, message: 'Unknown widget component "WidgetInput"' }]);
    });

    it("reports each unknown name once per file", async () => {
        const file = await docFile("repeated.md", ["`WidgetInput`", "`WidgetInput`", "<WidgetInput />"].join("\n"));
        const { errors } = validateClientSymbols({ files: [file], clientLibDir });
        expect(errors).toHaveLength(1);
        expect(errors[0].line).toBe(1);
    });

    it("ignores server class names that share the Widget prefix", async () => {
        const file = await docFile(
            "server.md",
            "`WidgetSerializer`, `WidgetViewSet`, `WidgetFilterSet`, and `WidgetAdmin` are Django classes.",
        );
        expect(validateClientSymbols({ files: [file], clientLibDir }).errors).toEqual([]);
    });

    it("ignores allowlisted names", async () => {
        const file = await docFile("proposed.md", "A new `WidgetSegmentedRadio` would express the rail recipe.");
        expect(validateClientSymbols({ files: [file], clientLibDir }).errors).toEqual([]);
    });

    it("skips generated reference trees", async () => {
        const generated = path.join(docsDir, "reference", "api");
        await mkdir(generated, { recursive: true });
        const file = path.join(generated, "WidgetInput.md");
        await writeFile(file, "`WidgetInput`");
        const { errors, checkedFiles } = validateClientSymbols({ files: [file], clientLibDir });
        expect(errors).toEqual([]);
        expect(checkedFiles).toBe(0);
    });
});

describe("buildComponentIndex", () => {
    it("returns an empty set for a directory that does not exist", () => {
        expect(buildComponentIndex(path.join(tmpdir(), "client-symbols-absent"))).toEqual(new Set());
    });
});
