import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
const app = express();

app.use(cors());
app.use(express.json());
// const createMCPServer = () => {
const server = new McpServer(
  {
    name: "Blog-MCP-Server",
    version: "1.0.0",
    description: "MCP server to manage a blog",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  },
);

server.registerTool(
  "create_post",
  {
    description: "Create a new post",
    inputSchema: {
      title: z.string().min(5),
      author: z.string().min(3),
      category: z.enum(["tech", "finance", "lifestyle"]),
      body: z.string().min(50),
    },
  },
  async ({ title, author, category, body }) => {
    console.log("Creating post with title:", title);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            title,
            author,
            category,
            body,
          }),
        },
      ],
    };
  },
);

// --- Resource: API guide for posts (national duty / general) ---
server.registerResource(
  "posts-api-guide",
  "https://posts-api.example/guide",
  {
    title: "Posts API Guide",
    description:
      "Guide for creating and managing posts (e.g. national duty). Categories: tech, finance, lifestyle. Title min 5 chars, author min 3, body min 50.",
    mimeType: "text/plain",
  },
  async () => {
    return {
      contents: [
        {
          uri: "https://posts-api.example/guide",
          text: 'Posts API: create_post (title, author, category, body), get_post(postId), update_post(postId, ...), delete_post(postId), list_posts. Categories: tech, finance, lifestyle. Use this workflow for a "national duty" post: create → edit → view → delete.',
        },
      ],
    };
  },
);
// --- Prompt: run full post workflow (create national duty post → edit → view → delete) ---
server.registerPrompt(
  "national-duty-post-workflow",
  {
    title: "National Duty Post: Create, Edit, View, Delete",
    description:
      "Runs all post tools in sequence: create a post on national duty, edit it, view it, then delete it.",
  },
  async () => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `You must use the Posts API tools in this exact order. Do each step and use the post ID from step 1 for steps 2, 3, and 4.

1) CREATE: Call create_post to create a new post about "national duty". Use:
   - title: at least 5 characters (e.g. "Why National Duty Matters")
   - author: at least 3 characters (e.g. "Jane Doe")
   - category: one of tech, finance, or lifestyle (e.g. "lifestyle")
   - body: at least 50 characters describing the importance of national duty, civic responsibility, or serving the country.

2) EDIT: Call update_post with the _id returned from step 1. Change the title or body to an edited version (e.g. add a sentence or refine the message). Keep author and category the same; title and body must still meet minimum length rules.

3) VIEW: Call get_post with the same post _id to fetch and show the current post.

4) DELETE: Call delete_post with the same post _id to remove the post.

After each tool call, report the result briefly. Complete all four steps in order.`,
          },
        },
      ],
    };
  },
);
server.registerTool(
  "get-weather",
  {
    description: "Tool to get the weather for a city",
    inputSchema: {
      city: z.string().describe("The name of the city to get the weather for"),
    },
  },
  async ({ city }) => {
    // get coordinates for the city
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=10&language=en&format=json`,
    );
    const data = await response.json();

    // handle city not found
    if (data.results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `City ${city} not found.`,
          },
        ],
      };
    }

    // get the weather data using the coordinates
    const { latitude, longitude } = data.results[0];

    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,rain,showers,cloud_cover,apparent_temperature`,
    );

    const weatherData = await weatherResponse.json();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(weatherData, null, 2),
        },
      ],
    };
  },
);

//   return server;
// };

const transport = new StdioServerTransport();
server.connect(transport);

// app.post("/mcp", async (req, res) => {
//   const server = createMCPServer();
//   const transport = new StreamableHTTPServerTransport({
//     sessionIdGenerator: undefined,
//   });

//   try {
//     await server.connect(transport);
//     await transport.handleRequest(req, res, req.body);
//   } catch (error) {
//   } finally {
//     req.on("close", () => {
//       transport.close().catch(() => {});
//       // server.close().catch(() => {});
//     });
//   }
// });
// app.get("/mcp", (req, res) => {
//   res.send("Successful");
// });
// app.listen(5001, () => {
//   console.log("MCP Server Started");
// });
