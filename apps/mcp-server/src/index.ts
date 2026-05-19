import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { brokerFetch } from "./broker-client.js";

const server = new McpServer({
  name: "perplexity-desktop-broker",
  version: "0.1.0",
});

server.tool(
  "perplexity_ensure_session",
  "Ensure Perplexity browser session is ready (manual login required once).",
  { session_id: z.string().default("default") },
  async ({ session_id }) => {
    const result = await brokerFetch<unknown>("/session/ensure", {
      method: "POST",
      body: JSON.stringify({ sessionId: session_id }),
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "perplexity_new_thread",
  "Start a new Perplexity chat thread.",
  { session_id: z.string().default("default") },
  async ({ session_id }) => {
    const result = await brokerFetch<unknown>("/thread/new", {
      method: "POST",
      body: JSON.stringify({ sessionId: session_id }),
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "perplexity_send_prompt",
  "Send a prompt and wait for the final answer.",
  {
    session_id: z.string().default("default"),
    text: z.string(),
    new_thread: z.boolean().optional(),
    timeout_ms: z.number().optional(),
    response_format: z
      .enum(["text", "markdown", "html_fragment", "json_best_effort"])
      .optional(),
  },
  async ({ session_id, text, new_thread, timeout_ms, response_format }) => {
    const result = await brokerFetch<unknown>("/chat/send", {
      method: "POST",
      body: JSON.stringify({
        sessionId: session_id,
        text,
        newThread: new_thread,
        timeoutMs: timeout_ms,
        wait: true,
        responseFormat: response_format ?? "markdown",
      }),
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "perplexity_get_last_answer",
  "Get last answer from current thread (runs send with empty check via broker).",
  {
    session_id: z.string().default("default"),
    response_format: z
      .enum(["text", "markdown", "html_fragment", "json_best_effort"])
      .optional(),
  },
  async () => ({
    content: [
      {
        type: "text",
        text: "Use perplexity_send_prompt; dedicated get_last_answer HTTP route is not exposed in MVP.",
      },
    ],
  }),
);

server.tool(
  "perplexity_cancel",
  "Cancel in-flight generation.",
  { session_id: z.string().default("default") },
  async ({ session_id }) => {
    const result = await brokerFetch<unknown>("/chat/cancel", {
      method: "POST",
      body: JSON.stringify({ sessionId: session_id }),
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "perplexity_upload_file",
  "Upload a file to the current chat.",
  {
    session_id: z.string().default("default"),
    file_path: z.string(),
  },
  async ({ session_id, file_path }) => {
    const result = await brokerFetch<unknown>("/attachment/upload", {
      method: "POST",
      body: JSON.stringify({ sessionId: session_id, filePath: file_path }),
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool("perplexity_health", "Broker and browser health.", {}, async () => {
  const result = await brokerFetch<unknown>("/health");
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
