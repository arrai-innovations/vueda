/**
 * @module theme/vueda-tailwind/views/_ActionBannerPrimitives.theme
 *
 * Shared theme primitives for action banner rows. Parent components compose
 * these into their public theme keys so existing override surfaces remain
 * stable while the common banner recipe has one owner.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    _ActionBanner: {
        /** Shared banner row scaffold: icon tile plus body column with a bottom separator. */
        banner: {
            class: ["flex items-start gap-3 p-4", "border-b-hairline"],
        },
        /** Shared 36 px icon tile geometry. Parent keys add tone colours. */
        bannerIcon: {
            class: [
                "flex items-center justify-center shrink-0",
                "w-9 h-9 rounded-full",
                "text-[18px] font-semibold leading-none",
            ],
        },
        /** Shared body column beside the icon. */
        bannerBody: {
            class: ["flex flex-col gap-1 min-w-0"],
        },
        /** Shared banner title text recipe. */
        bannerTitle: {
            class: ["text-[14px] font-semibold leading-[1.3] text-foreground"],
        },
        /** Shared banner supporting-copy recipe. */
        bannerDesc: {
            class: ["text-[12px] font-normal leading-[1.5] text-muted-foreground"],
        },
    },
});
