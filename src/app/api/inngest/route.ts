import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generateLecture } from "@/inngest/generate-lecture";
import { regenerateBlock } from "@/inngest/regenerate-block";

export const maxDuration = 300;

export const { GET, POST, PUT } = serve({ client: inngest, functions: [generateLecture, regenerateBlock] });
