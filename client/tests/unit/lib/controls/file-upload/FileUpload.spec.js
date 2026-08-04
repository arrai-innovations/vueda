import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import FileUpload from "@vueda/controls/file-upload/FileUpload.vue";

describe("lib/controls/file-upload/FileUpload.vue", () => {
    describe("rendering", () => {
        scopedIt("renders as a div by default with data-slot", () => {
            const wrapper = mount(FileUpload);
            expect(wrapper.element.tagName).toBe("DIV");
            expect(wrapper.attributes("data-slot")).toBe("file-upload");
        });

        scopedIt("renders a hidden file input", () => {
            const wrapper = mount(FileUpload);
            const input = wrapper.find("input[type='file']");
            expect(input.exists()).toBe(true);
            expect(input.classes()).toContain("sr-only");
        });

        scopedIt("renders a trigger button with default content", () => {
            const wrapper = mount(FileUpload);
            const trigger = wrapper.find("[data-slot='file-upload-trigger']");
            expect(trigger.exists()).toBe(true);
            expect(trigger.text()).toContain("Choose file");
        });

        scopedIt("does not render drop message when dropzone is false", () => {
            const wrapper = mount(FileUpload);
            expect(wrapper.find("[data-slot='file-upload-drop-message']").exists()).toBe(false);
        });

        scopedIt("renders drop message when dropzone is true", () => {
            const wrapper = mount(FileUpload, { props: { dropzone: true } });
            const msg = wrapper.find("[data-slot='file-upload-drop-message']");
            expect(msg.exists()).toBe(true);
            expect(msg.text()).toContain("or drag and drop here");
        });

        scopedIt("passes accept prop to native input", () => {
            const wrapper = mount(FileUpload, { props: { accept: "image/*" } });
            expect(wrapper.find("input[type='file']").attributes("accept")).toBe("image/*");
        });

        scopedIt("disables trigger button and input when disabled", () => {
            const wrapper = mount(FileUpload, { props: { disabled: true } });
            expect(wrapper.find("[data-slot='file-upload-trigger']").attributes("disabled")).toBeDefined();
            expect(wrapper.find("input[type='file']").attributes("disabled")).toBeDefined();
        });

        scopedIt("sets data-dropzone attribute when dropzone is true", () => {
            const wrapper = mount(FileUpload, { props: { dropzone: true } });
            expect(wrapper.attributes("data-dropzone")).toBe("true");
        });

        scopedIt("sets data-disabled attribute when disabled", () => {
            const wrapper = mount(FileUpload, { props: { disabled: true } });
            expect(wrapper.attributes("data-disabled")).toBe("true");
        });
    });

    describe("file selection", () => {
        scopedIt("emits update:modelValue when a file is selected via input", async () => {
            const wrapper = mount(FileUpload);
            const input = wrapper.find("input[type='file']");
            const file = new File(["content"], "test.txt", { type: "text/plain" });

            Object.defineProperty(input.element, "files", { value: [file], writable: false });
            await input.trigger("change");

            expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
            expect(wrapper.emitted("update:modelValue")[0][0]).toBe(file);
        });

        scopedIt("rejects files exceeding maxFileSize", async () => {
            const wrapper = mount(FileUpload, { props: { maxFileSize: 10 } });
            const input = wrapper.find("input[type='file']");
            const bigFile = new File(["a".repeat(20)], "big.txt", { type: "text/plain" });

            Object.defineProperty(input.element, "files", { value: [bigFile], writable: false });
            await input.trigger("change");

            expect(wrapper.emitted("update:modelValue")).toBeUndefined();
        });

        scopedIt("does not emit when disabled", async () => {
            const wrapper = mount(FileUpload, { props: { disabled: true } });
            const input = wrapper.find("input[type='file']");
            const file = new File(["content"], "test.txt", { type: "text/plain" });

            Object.defineProperty(input.element, "files", { value: [file], writable: false });
            await input.trigger("change");

            expect(wrapper.emitted("update:modelValue")).toBeUndefined();
        });
    });

    describe("drag and drop", () => {
        scopedIt("emits update:modelValue on drop when dropzone is enabled", async () => {
            const wrapper = mount(FileUpload, { props: { dropzone: true } });
            const file = new File(["content"], "dropped.txt", { type: "text/plain" });

            await wrapper.trigger("dragover", { dataTransfer: { files: [file] } });
            expect(wrapper.attributes("data-dragging")).toBe("true");

            await wrapper.trigger("drop", { dataTransfer: { files: [file] } });
            expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
            expect(wrapper.emitted("update:modelValue")[0][0]).toBe(file);
        });

        scopedIt("clears dragging state on dragleave", async () => {
            const wrapper = mount(FileUpload, { props: { dropzone: true } });

            await wrapper.trigger("dragover", { dataTransfer: { files: [] } });
            expect(wrapper.attributes("data-dragging")).toBe("true");

            await wrapper.trigger("dragleave");
            expect(wrapper.attributes("data-dragging")).toBeUndefined();
        });

        scopedIt("ignores drop events when dropzone is false", async () => {
            const wrapper = mount(FileUpload);
            const file = new File(["content"], "dropped.txt", { type: "text/plain" });

            await wrapper.trigger("drop", { dataTransfer: { files: [file] } });
            expect(wrapper.emitted("update:modelValue")).toBeUndefined();
        });

        scopedIt("ignores drop events when disabled", async () => {
            const wrapper = mount(FileUpload, { props: { dropzone: true, disabled: true } });
            const file = new File(["content"], "dropped.txt", { type: "text/plain" });

            await wrapper.trigger("drop", { dataTransfer: { files: [file] } });
            expect(wrapper.emitted("update:modelValue")).toBeUndefined();
        });
    });

    describe("openFilePicker", () => {
        scopedIt("exposes openFilePicker method", () => {
            const wrapper = mount(FileUpload);
            expect(typeof wrapper.vm.openFilePicker).toBe("function");
        });
    });
});
