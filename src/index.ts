#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = (process.env.TARTARUS_BASE_URL ?? "https://api.tartarusai.dev/v1").replace(/\/+$/, "");
const MODEL = process.env.TARTARUS_MODEL ?? "tartarus-coder";
const TOKEN = process.env.TARTARUS_TOKEN;

async function ask(prompt: string, system?: string): Promise<string> {
  if (!TOKEN) throw new Error("Set TARTARUS_TOKEN in the environment.");
  const messages: { role: string; content: string }[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages }),
  });
  if (!res.ok) throw new Error(`Tartarus API ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

const server = new McpServer({ name: "tartarus-mcp", version: "0.1.0" });

server.tool(
  "tartarus_code",
  "Ask the Tartarus uncensored coding model to write, explain, or refactor code. Returns the completion as text.",
  {
    prompt: z.string().describe("The coding task or question."),
    system: z.string().optional().describe("Optional system instruction, e.g. a coding style."),
  },
  async ({ prompt, system }) => {
    const text = await ask(prompt, system);
    return { content: [{ type: "text", text }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
