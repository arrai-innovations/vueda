import { actionTone, resolveActionVariant } from "@vueda/utils/actionVariant.js";

describe("lib/utils/actionVariant.js", () => {
    describe("actionTone", () => {
        it("is destructive for delete / destroy action names", () => {
            expect(actionTone("delete")).toBe("destructive");
            expect(actionTone("destroy")).toBe("destructive");
            expect(actionTone("bulk_delete")).toBe("destructive");
            expect(actionTone("destroy-all")).toBe("destructive");
        });

        it("is neutral for non-destructive action names", () => {
            expect(actionTone("create")).toBe("neutral");
            expect(actionTone("update")).toBe("neutral");
            expect(actionTone("read")).toBe("neutral");
            expect(actionTone("deactivate")).toBe("neutral");
        });

        it("honors an explicit tone in the action metadata over the name heuristic", () => {
            expect(actionTone("archive", { tone: "destructive" })).toBe("destructive");
            expect(actionTone("destroy", { tone: "neutral" })).toBe("neutral");
        });
    });

    describe("resolveActionVariant", () => {
        it("rests at outline by default", () => {
            expect(resolveActionVariant({ actionName: "export" })).toEqual({ tone: "neutral", emphasis: "outline" });
        });

        it("rests at the requested placement emphasis", () => {
            expect(resolveActionVariant({ actionName: "tag", emphasis: "ghost" })).toEqual({
                tone: "neutral",
                emphasis: "ghost",
            });
        });

        it("promotes a neutral action to the primary fill CTA", () => {
            expect(resolveActionVariant({ actionName: "create", primary: true })).toEqual({
                tone: "primary",
                emphasis: "fill",
            });
        });

        it("keeps a promoted destructive action destructive (filled, not primary)", () => {
            expect(resolveActionVariant({ actionName: "destroy", primary: true })).toEqual({
                tone: "destructive",
                emphasis: "fill",
            });
        });

        it("rests a destructive action at the placement emphasis, destructive-toned", () => {
            expect(resolveActionVariant({ actionName: "delete", emphasis: "ghost" })).toEqual({
                tone: "destructive",
                emphasis: "ghost",
            });
        });

        it("lets explicit tone override the intrinsic tone while primary owns emphasis", () => {
            expect(resolveActionVariant({ actionName: "create", primary: true, tone: "neutral" })).toEqual({
                tone: "neutral",
                emphasis: "fill",
            });
        });
    });
});
