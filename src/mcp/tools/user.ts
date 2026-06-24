import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { hevyRequest } from "../../hevy/client.ts";
import { registerTool } from "./helpers.ts";

export function registerUserTools(server: McpServer): void {
  registerTool(
    server,
    "get_user_info",
    {
      title: "Get user info",
      description: "Retrieve information about the authenticated Hevy user (ID, username, profile URL).",
    },
    () => hevyRequest("GET", "/v1/user/info"),
  );
}
