import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { hevyRequest } from "../../hevy/client.ts";
import { registerTool } from "./helpers.ts";
import { paginationShape, createExerciseSchema } from "../../hevy/schemas.ts";

export function registerExerciseTools(server: McpServer): void {
  registerTool(
    server,
    "list_exercise_templates",
    {
      title: "List exercise templates",
      description:
        "Retrieve a paginated list of exercise templates available on the account (built-in + custom). Use this to find exercise_template_id values for creating workouts and routines.",
      inputSchema: paginationShape(100),
    },
    (a) =>
      hevyRequest("GET", "/v1/exercise_templates", {
        query: { page: a.page, pageSize: a.pageSize },
      }),
  );

  registerTool(
    server,
    "get_exercise_template",
    {
      title: "Get exercise template",
      description: "Retrieve a single exercise template by its ID.",
      inputSchema: { exerciseTemplateId: z.string().describe("The exercise template ID.") },
    },
    (a) => hevyRequest("GET", `/v1/exercise_templates/${encodeURIComponent(a.exerciseTemplateId)}`),
  );

  registerTool(
    server,
    "create_exercise_template",
    {
      title: "Create custom exercise template",
      description:
        "Create a custom exercise template on the account. Returns the new template ID, which can then be used in workouts and routines.",
      inputSchema: createExerciseSchema.shape,
    },
    (a) => hevyRequest("POST", "/v1/exercise_templates", { body: { exercise: a } }),
  );

  registerTool(
    server,
    "get_exercise_history",
    {
      title: "Get exercise history",
      description:
        "Retrieve the user's logged history for a specific exercise template, optionally filtered by date range. Useful for tracking progress on a lift.",
      inputSchema: {
        exerciseTemplateId: z.string().describe("The exercise template ID to get history for."),
        start_date: z.string().optional().describe("ISO 8601 start date filter (inclusive)."),
        end_date: z.string().optional().describe("ISO 8601 end date filter (inclusive)."),
      },
    },
    (a) =>
      hevyRequest("GET", `/v1/exercise_history/${encodeURIComponent(a.exerciseTemplateId)}`, {
        query: { start_date: a.start_date, end_date: a.end_date },
      }),
  );
}
