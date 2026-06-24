import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { hevyRequest } from "../../hevy/client.ts";
import { registerTool } from "./helpers.ts";
import { paginationShape, createRoutineSchema, updateRoutineSchema } from "../../hevy/schemas.ts";

export function registerRoutineTools(server: McpServer): void {
  registerTool(
    server,
    "list_routines",
    {
      title: "List routines",
      description: "Retrieve a paginated list of the user's saved routines (workout templates).",
      inputSchema: paginationShape(10),
    },
    (a) => hevyRequest("GET", "/v1/routines", { query: { page: a.page, pageSize: a.pageSize } }),
  );

  registerTool(
    server,
    "get_routine",
    {
      title: "Get routine",
      description: "Retrieve full details of a single routine by its ID.",
      inputSchema: { routineId: z.string().describe("The routine ID.") },
    },
    (a) => hevyRequest("GET", `/v1/routines/${encodeURIComponent(a.routineId)}`),
  );

  registerTool(
    server,
    "create_routine",
    {
      title: "Create routine",
      description:
        "Create a new routine (workout template). Provide a title and the planned exercises with their sets. Optionally place it in a folder via folder_id (see list_routine_folders).",
      inputSchema: createRoutineSchema.shape,
    },
    (a) => hevyRequest("POST", "/v1/routines", { body: { routine: a } }),
  );

  registerTool(
    server,
    "update_routine",
    {
      title: "Update routine",
      description:
        "Update an existing routine by ID. Provide the full routine object (title, notes, exercises, sets) — it replaces the existing one.",
      inputSchema: {
        routineId: z.string().describe("The ID of the routine to update."),
        ...updateRoutineSchema.shape,
      },
    },
    (a) => {
      const { routineId, ...routine } = a;
      return hevyRequest("PUT", `/v1/routines/${encodeURIComponent(routineId)}`, {
        body: { routine },
      });
    },
  );

  // ---- Routine folders ----

  registerTool(
    server,
    "list_routine_folders",
    {
      title: "List routine folders",
      description: "Retrieve a paginated list of the user's routine folders.",
      inputSchema: paginationShape(10),
    },
    (a) =>
      hevyRequest("GET", "/v1/routine_folders", { query: { page: a.page, pageSize: a.pageSize } }),
  );

  registerTool(
    server,
    "get_routine_folder",
    {
      title: "Get routine folder",
      description: "Retrieve a single routine folder by its ID.",
      inputSchema: { folderId: z.string().describe("The routine folder ID.") },
    },
    (a) => hevyRequest("GET", `/v1/routine_folders/${encodeURIComponent(a.folderId)}`),
  );

  registerTool(
    server,
    "create_routine_folder",
    {
      title: "Create routine folder",
      description: "Create a new routine folder. It is created at the top (index 0).",
      inputSchema: { title: z.string().describe("The title of the routine folder.") },
    },
    (a) => hevyRequest("POST", "/v1/routine_folders", { body: { routine_folder: { title: a.title } } }),
  );
}
