describe("index.js", () => {
    it("should throw an error when imported", async () => {
        await expect(import("../../index.js")).rejects.toThrowError(
            "Don't import from the package, use paths to the files you need and the '@vueda' alias.",
        );
    });
});
