// Thin wrapper around the Hevy REST API. Every request carries the single
// `api-key` header from configuration. Non-2xx responses are turned into a
// readable Error so tool handlers can surface them to the model.

import { config } from "../config.ts";

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  query?: Query;
  body?: unknown;
}

export class HevyError extends Error {
  constructor(
    public status: number,
    public body: string,
    message: string,
  ) {
    super(message);
    this.name = "HevyError";
  }
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(config.hevyBaseUrl + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export async function hevyRequest(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  options: RequestOptions = {},
): Promise<unknown> {
  const headers: Record<string, string> = {
    "api-key": config.hevyApiKey,
    Accept: "application/json",
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(buildUrl(path, options.query), {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();

  if (!res.ok) {
    throw new HevyError(
      res.status,
      text,
      `Hevy API ${method} ${path} failed with ${res.status} ${res.statusText}: ${text || "(empty body)"}`,
    );
  }

  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text; // some endpoints return plain text / empty-ish bodies
  }
}
