import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { hevyRequest } from "../../hevy/client.ts";
import { registerTool } from "./helpers.ts";
import { paginationShape, workoutSchema } from "../../hevy/schemas.ts";

export function registerWorkoutTools(server: McpServer): void {
  registerTool(
    server,
    "list_workouts",
    {
      title: "List workouts",
      description: "Retrieve a paginated list of the user's logged workouts (most recent first).",
      inputSchema: paginationShape(10),
    },
    (a) => hevyRequest("GET", "/v1/workouts", { query: { page: a.page, pageSize: a.pageSize } }),
  );

  registerTool(
    server,
    "get_workout",
    {
      title: "Get workout",
      description: "Retrieve full details of a single workout by its ID.",
      inputSchema: { workoutId: z.string().describe("The workout ID.") },
    },
    (a) => hevyRequest("GET", `/v1/workouts/${encodeURIComponent(a.workoutId)}`),
  );

  registerTool(
    server,
    "get_workout_count",
    {
      title: "Get workout count",
      description: "Retrieve the total number of workouts the user has logged.",
    },
    () => hevyRequest("GET", "/v1/workouts/count"),
  );

  registerTool(
    server,
    "get_workout_events",
    {
      title: "Get workout events",
      description:
        "Retrieve a paginated list of workout events (updates or deletes) since a given timestamp. Useful for syncing changes.",
      inputSchema: {
        ...paginationShape(10),
        since: z
          .string()
          .optional()
          .describe("ISO 8601 timestamp; only events after this are returned. Defaults to epoch."),
      },
    },
    (a) =>
      hevyRequest("GET", "/v1/workouts/events", {
        query: { page: a.page, pageSize: a.pageSize, since: a.since },
      }),
  );

  registerTool(
    server,
    "create_workout",
    {
      title: "Create workout",
      description:
        "Log a new completed workout. Provide title, start_time and end_time (ISO 8601), and the exercises performed with their sets. Use list_exercise_templates to find exercise_template_id values.",
      inputSchema: workoutSchema.shape,
    },
    (a) => hevyRequest("POST", "/v1/workouts", { body: { workout: a } }),
  );

  registerTool(
    server,
    "update_workout",
    {
      title: "Update workout",
      description:
        "Update an existing workout by ID. Provide the full workout object (title, times, exercises, sets) — it replaces the existing one.",
      inputSchema: {
        workoutId: z.string().describe("The ID of the workout to update."),
        ...workoutSchema.shape,
      },
    },
    (a) => {
      const { workoutId, ...workout } = a;
      return hevyRequest("PUT", `/v1/workouts/${encodeURIComponent(workoutId)}`, {
        body: { workout },
      });
    },
  );
}
