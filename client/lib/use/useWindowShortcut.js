import isArray from "lodash-es/isArray.js";
import os from "platform-detect/os.mjs";
import { effectScope, onActivated, onDeactivated, onMounted, toRef, unref, watchEffect } from "vue";

export default function useWindowShortcut(props) {
    const triggers = toRef(() => props.triggers);
    const processedTriggers = [];

    const onKeyDown = (event) => {
        if (event.repeat) {
            return;
        }
        if (!event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
            return;
        }
        for (const { keys, modifiers, fn } of processedTriggers) {
            if (keys.includes(event.key)) {
                if (modifiers?.length ? modifiers.every((e) => event[e]) : true) {
                    event.stopPropagation();
                    event.preventDefault();
                    fn(event);
                    return;
                }
            }
        }
    };

    const es = effectScope();
    es.run(() => {
        watchEffect(() => {
            processedTriggers.length = 0;
            for (const trigger of unref(triggers)) {
                let processedMods = os.macos ? trigger.macOsModifiers : trigger.modifiers;
                if (processedMods) {
                    processedMods = isArray(processedMods) ? processedMods : [processedMods];
                }
                const processedKeys = (isArray(trigger.keys) ? trigger.keys : [trigger.keys]).map((key) => {
                    if (processedMods?.includes("shiftKey")) {
                        return key.toUpperCase();
                    }
                    return key;
                });
                processedTriggers.push({
                    keys: processedKeys,
                    modifiers: processedMods,
                    fn: trigger.fn,
                });
            }
        });
    });

    onMounted(function () {
        document.addEventListener("keydown", onKeyDown);
    });
    onActivated(function () {
        document.addEventListener("keydown", onKeyDown);
    });

    onDeactivated(function () {
        document.removeEventListener("keydown", onKeyDown);
    });
}
