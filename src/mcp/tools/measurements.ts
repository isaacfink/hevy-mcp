import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { hevyRequest } from "../../hevy/client.ts";
import { registerTool } from "./helpers.ts";
import {
  paginationShape,
  createBodyMeasurementSchema,
  updateBodyMeasurementShape,
} from "../../hevy/schemas.ts";

export function registerMeasurementTools(server: McpServer): void {
  registerTool(
    server,
    "list_body_measurements",
    {
      title: "List body measurements",
      description: "Retrieve a paginated list of the user's logged body measurements.",
      inputSchema: paginationShape(10),
    },
    (a) =>
      hevyRequest("GET", "/v1/body_measurements", { query: { page: a.page, pageSize: a.pageSize } }),
  );

  registerTool(
    server,
    "get_body_measurement",
    {
      title: "Get body measurement",
      description: "Retrieve the body measurement entry for a specific date.",
      inputSchema: { date: z.string().describe("The date in YYYY-MM-DD format.") },
    },
    (a) => hevyRequest("GET", `/v1/body_measurements/${encodeURIComponent(a.date)}`),
  );

  registerTool(
    server,
    "create_body_measurement",
    {
      title: "Create body measurement",
      description:
        "Create a body measurement entry for a given date (YYYY-MM-DD). Include any subset of measurements (weight_kg, fat_percent, waist, etc.). Returns 409 if an entry for that date already exists — use update_body_measurement instead.",
      inputSchema: createBodyMeasurementSchema.shape,
    },
    (a) => hevyRequest("POST", "/v1/body_measurements", { body: a }),
  );

  registerTool(
    server,
    "update_body_measurement",
    {
      title: "Update body measurement",
      description:
        "Update the body measurement entry for an existing date (YYYY-MM-DD). Provide the measurement fields to set.",
      inputSchema: {
        date: z.string().describe("The date of the entry to update, in YYYY-MM-DD format."),
        ...updateBodyMeasurementShape,
      },
    },
    (a) => {
      const { date, ...measurements } = a;
      return hevyRequest("PUT", `/v1/body_measurements/${encodeURIComponent(date)}`, {
        body: measurements,
      });
    },
  );
}
