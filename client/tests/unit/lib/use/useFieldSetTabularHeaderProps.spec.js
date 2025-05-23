import { scopedIt } from "@tests/unit/utils.js";
import { nextTick, reactive, ref } from "vue";

describe("lib/use/useFieldSetTabularHeaderProps.js", () => {
    let useFieldSetTabularHeaderProps;

    beforeEach(async () => {
        useFieldSetTabularHeaderProps = (await import("@vueda/use/useFieldSetTabularHeaderProps.js"))
            .useFieldSetTabularHeaderProps;
    });

    afterEach(() => {
        // vitest automatically resets modules between tests
    });

    scopedIt("computes header props from form model and form context", async () => {
        const formModel = reactive({
            fieldDetails: {
                someField: { label: "Initial Label" },
            },
            widgetProps: {
                someField: { help: "Initial help", readOnly: true },
            },
        });
        const formContext = {
            state: reactive({
                required: { "field.path": true },
                errors: { "field.path": { error: "msg" } },
            }),
        };

        const result = useFieldSetTabularHeaderProps(formModel, formContext, ref("someField"), ref("field.path"));

        expect(result.label.value).toBe("Initial Label");
        expect(result.help.value).toBe("Initial help");
        expect(result.required.value).toBe(true);
        expect(result.invalid.value).toBe(true);
        expect(result.readOnly.value).toBe(true);

        formModel.fieldDetails.someField.label = "Updated Label";
        formModel.widgetProps.someField.help = "Updated help";
        formModel.widgetProps.someField.readOnly = false;
        formContext.state.required["field.path"] = false;
        formContext.state.errors["field.path"] = {};
        await nextTick();

        expect(result.label.value).toBe("Updated Label");
        expect(result.help.value).toBe("Updated help");
        expect(result.required.value).toBe(false);
        expect(result.invalid.value).toBe(false);
        expect(result.readOnly.value).toBe(false);
    });

    scopedIt("falls back to defaults when data is missing", () => {
        const formModel = reactive({ fieldDetails: {}, widgetProps: {} });
        const formContext = { state: reactive({ required: {}, errors: {} }) };

        const result = useFieldSetTabularHeaderProps(formModel, formContext, "missingField", "missing.path");

        expect(result.label.value).toBe("missingField");
        expect(result.help.value).toBe("");
        expect(result.required.value).toBe(false);
        expect(result.invalid.value).toBe(false);
        expect(result.readOnly.value).toBeUndefined();
    });
});
