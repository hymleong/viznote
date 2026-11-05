import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generateLecture } from "@/inngest/generate-lecture";

export const maxDuration = 300;

export const { GET, POST, PUT } = serve({ client: inngest, functions: [generateLecture] });
