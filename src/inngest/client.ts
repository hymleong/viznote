import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "viznotes" });

export const GENERATE_EVENT = "lecture/generate.requested";
export const REGENERATE_EVENT = "block/regenerate.requested";
