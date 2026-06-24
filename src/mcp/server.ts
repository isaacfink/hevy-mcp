// Builds the MCP server and registers every Hevy tool. A fresh server is created
// per request (the transport runs statelessly), which keeps requests isolated and
// avoids cross-connection state — registration is cheap.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerWorkoutTools } from "./tools/workouts.ts";
import { registerRoutineTools } from "./tools/routines.ts";
import { registerExerciseTools } from "./tools/exercises.ts";
import { registerMeasurementTools } from "./tools/measurements.ts";
import { registerUserTools } from "./tools/user.ts";

export function buildMcpServer(): McpServer {
  const server = new McpServer({
    name: "hevy-mcp",
    version: "1.0.0",
  });

  registerWorkoutTools(server);
  registerRoutineTools(server);
  registerExerciseTools(server);
  registerMeasurementTools(server);
  registerUserTools(server);

  return server;
}
