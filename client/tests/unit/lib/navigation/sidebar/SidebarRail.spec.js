import { scopedIt } from "@tests/unit/utils.js";
import "@vueda/theme/vueda-tailwind/navigation/SidebarRail.theme.js";
import { getTheme } from "@vueda/use/themeRegistry.js";

describe("lib/navigation/sidebar/SidebarRail.vue", () => {
    describe("theme", () => {
        scopedIt("uses a pointer cursor instead of a resize cursor", () => {
            const className = getTheme().SidebarRail.root.class;
            const classes = Array.isArray(className) ? className.join(" ") : className;

            expect(classes).toContain("cursor-pointer");
            expect(classes).not.toContain("cursor-w-resize");
            expect(classes).not.toContain("cursor-e-resize");
        });
    });
});
