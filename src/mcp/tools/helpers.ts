// Shared helpers for registering Hevy tools with consistent result formatting
// and error handling.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { HevyError } from "../../hevy/client.ts";

export interface ToolDef {
  title?: string;
  description: string;
  inputSchema?: ZodRawShape;
}

function jsonResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

// Registers a tool whose handler returns raw data; the result is JSON-formatted
// and any error (Hevy API or otherwise) is returned as an isError result so the
// model can read and react to it.
export function registerTool(
  server: McpServer,
  name: string,
  def: ToolDef,
  handler: (args: any) => Promise<unknown>,
): void {
  server.registerTool(name, def as any, async (args: any) => {
    try {
      return jsonResult(await handler(args ?? {}));
    } catch (err) {
      const message =
        err instanceof HevyError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  });
}
