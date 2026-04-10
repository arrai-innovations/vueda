import { createContext } from "reka-ui";

export const [useCommand, provideCommandContext] = createContext("Command");
export const [useCommandGroup, provideCommandGroupContext] = createContext("CommandGroup");
