#!/usr/bin/env python3
"""MCP service discovery using a low-privilege Supabase publishable key."""
import asyncio
import json
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
from marketplace_core import public_client, search_services, get_service, get_service_reviews

server = Server("adventurers-guild-public-marketplace")
TOOLS = [
    Tool(name="search_services", description="Search Guild's public Taiwan business services; price values are in TWD and not firm offers.",
         inputSchema={"type":"object", "properties":{"query":{"type":"string"},"city":{"type":"string"},"category":{"type":"string"},"limit":{"type":"integer","minimum":1,"maximum":30}}}),
    Tool(name="get_service", description="Read a published Guild business service by ID.",
         inputSchema={"type":"object","properties":{"service_id":{"type":"string","format":"uuid"}},"required":["service_id"]}),
    Tool(name="get_service_reviews", description="Read buyer-confirmed inquiry reviews; no private inquiry details.",
         inputSchema={"type":"object","properties":{"service_id":{"type":"string","format":"uuid"},"limit":{"type":"integer","minimum":1,"maximum":30}},"required":["service_id"]})
]

@server.list_tools()
async def list_tools():
    return TOOLS

@server.call_tool()
async def call_tool(name, arguments):
    try:
        client = public_client()
        if name == "search_services":
            result = await asyncio.to_thread(search_services, client, **arguments)
        elif name == "get_service":
            result = await asyncio.to_thread(get_service, client, arguments["service_id"])
        elif name == "get_service_reviews":
            result = await asyncio.to_thread(get_service_reviews, client,
                arguments["service_id"], arguments.get("limit", 15))
        else:
            result = {"error":"UNKNOWN_TOOL"}
        return [TextContent(type="text", text=json.dumps(result,ensure_ascii=False))]
    except Exception as exc:
        return [TextContent(type="text",text=json.dumps(
          {"error":type(exc).__name__,"message":"Search unavailable or invalid input"}))]

async def main():
    public_client()
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream,write_stream,server.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
