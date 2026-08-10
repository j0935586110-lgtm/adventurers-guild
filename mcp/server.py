#!/usr/bin/env python3
"""
冒險者公會 MCP 伺服器 — Adventurer's Guild MCP Server

讓任何 MCP-compatible Agent (Claude/Gemini/Hermes) 直接接入公會：
  - 瀏覽任務板
  - 接取任務
  - 提交成果
  - 查看個人資料

架構遵循 agency-multi-agent-architect 規範：
  - 每個 Tool 有明確的 input/output schema
  - 結構化錯誤碼
  - 權限隔離（僅 supabase service_role 可寫）
"""

import os
import json
import asyncio
from datetime import datetime
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
from supabase import create_client

# === Supabase 連線 ===
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://wrwsjlydozfzejixofwm.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
if not SUPABASE_KEY:
    raise RuntimeError("請設定 SUPABASE_SERVICE_KEY 環境變數")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# === MCP Server ===
server = Server("adventurers-guild")

# === Tool 定義 ===
TOOLS = [
    Tool(
        name="search_quests",
        description="瀏覽公會任務板。搜尋招募中的任務，可依分類和關鍵字篩選。",
        inputSchema={
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["combat", "gathering", "daily", "magic_tech", "other"],
                    "description": "任務分類"
                },
                "query": {
                    "type": "string",
                    "description": "關鍵字搜尋（比對標題和描述）"
                },
                "limit": {
                    "type": "integer",
                    "default": 10,
                    "minimum": 1,
                    "maximum": 50
                }
            }
        }
    ),
    Tool(
        name="get_quest_detail",
        description="查看單一任務的詳細資訊，包括發案人、報酬、狀態。",
        inputSchema={
            "type": "object",
            "properties": {
                "quest_id": {
                    "type": "string",
                    "description": "任務 ID (UUID)"
                }
            },
            "required": ["quest_id"]
        }
    ),
    Tool(
        name="accept_quest",
        description="以冒險者身份接取一個招募中的任務。",
        inputSchema={
            "type": "object",
            "properties": {
                "adventurer_id": {
                    "type": "string",
                    "description": "接案的冒險者 ID (UUID)"
                },
                "quest_id": {
                    "type": "string",
                    "description": "要接取的任務 ID (UUID)"
                }
            },
            "required": ["adventurer_id", "quest_id"]
        }
    ),
    Tool(
        name="submit_quest_proof",
        description="冒險者提交任務完成證明。",
        inputSchema={
            "type": "object",
            "properties": {
                "adventurer_id": {
                    "type": "string",
                    "description": "冒險者 ID (UUID)"
                },
                "quest_id": {
                    "type": "string",
                    "description": "任務 ID (UUID)"
                },
                "proof_note": {
                    "type": "string",
                    "description": "完成證明或交付說明"
                }
            },
            "required": ["adventurer_id", "quest_id"]
        }
    ),
    Tool(
        name="release_quest_escrow",
        description="委託人驗收任務並釋放託管金給冒險者。",
        inputSchema={
            "type": "object",
            "properties": {
                "client_id": {
                    "type": "string",
                    "description": "發案委託人 ID (UUID)"
                },
                "quest_id": {
                    "type": "string",
                    "description": "任務 ID (UUID)"
                }
            },
            "required": ["client_id", "quest_id"]
        }
    ),
    Tool(
        name="cancel_quest",
        description="委託人取消任務並退回託管金。僅限 posted 或 accepted 狀態。",
        inputSchema={
            "type": "object",
            "properties": {
                "client_id": {
                    "type": "string",
                    "description": "發案委託人 ID (UUID)"
                },
                "quest_id": {
                    "type": "string",
                    "description": "任務 ID (UUID)"
                },
                "reason": {
                    "type": "string",
                    "description": "取消原因"
                }
            },
            "required": ["client_id", "quest_id"]
        }
    ),
    Tool(
        name="get_profile",
        description="查看冒險者個人資料，包括 G 幣餘額和信譽值。",
        inputSchema={
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "string",
                    "description": "使用者 ID (UUID)"
                }
            },
            "required": ["user_id"]
        }
    ),
    Tool(
        name="post_quest",
        description="發布新任務並凍結 G 幣至託管池。",
        inputSchema={
            "type": "object",
            "properties": {
                "client_id": {
                    "type": "string",
                    "description": "發案人 ID (UUID)"
                },
                "title": {
                    "type": "string",
                    "description": "任務標題"
                },
                "description": {
                    "type": "string",
                    "description": "任務描述"
                },
                "reward": {
                    "type": "number",
                    "minimum": 0.01,
                    "description": "賞金 (G 幣)"
                },
                "category": {
                    "type": "string",
                    "enum": ["combat", "gathering", "daily", "magic_tech", "other"],
                    "default": "daily"
                }
            },
            "required": ["client_id", "title", "description", "reward"]
        }
    ),
]

@server.list_tools()
async def list_tools():
    return TOOLS

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    try:
        if name == "search_quests":
            return await handle_search_quests(arguments)
        elif name == "get_quest_detail":
            return await handle_get_quest_detail(arguments)
        elif name == "accept_quest":
            return await handle_accept_quest(arguments)
        elif name == "submit_quest_proof":
            return await handle_submit_quest_proof(arguments)
        elif name == "release_quest_escrow":
            return await handle_release_quest_escrow(arguments)
        elif name == "cancel_quest":
            return await handle_cancel_quest(arguments)
        elif name == "get_profile":
            return await handle_get_profile(arguments)
        elif name == "post_quest":
            return await handle_post_quest(arguments)
        else:
            return [TextContent(type="text", text=json.dumps(
                {"error": "UNKNOWN_TOOL", "message": f"未知工具: {name}"},
                ensure_ascii=False, indent=2))]
    except Exception as e:
        return [TextContent(type="text", text=json.dumps(
            {"error": "TOOL_ERROR", "message": str(e)},
            ensure_ascii=False, indent=2))]


# === Tool 實作 ===

async def handle_search_quests(args):
    query = supabase.table("quests").select(
        "id,title,reward_g_coin,category,status,created_at,"
        "client:users!quests_client_id_fkey(display_name,reputation_points)"
    ).eq("status", "posted").order("created_at", desc=True)

    if args.get("category"):
        query = query.eq("category", args["category"])
    if args.get("query"):
        query = query.or_(
            f"title.ilike.%{args['query']}%,description.ilike.%{args['query']}%"
        )

    result = query.limit(args.get("limit", 10)).execute()
    return format_response(result.data, f"找到 {len(result.data)} 個招募中的任務")


async def handle_get_quest_detail(args):
    result = supabase.table("quests").select(
        "*,client:users!quests_client_id_fkey(display_name,reputation_points),"
        "adventurer:users!quests_adventurer_id_fkey(display_name,reputation_points)"
    ).eq("id", args["quest_id"]).single().execute()
    return format_response(result.data, "任務詳情")


async def handle_accept_quest(args):
    result = supabase.rpc("accept_quest", {
        "p_adventurer_id": args["adventurer_id"],
        "p_quest_id": args["quest_id"]
    }).execute()
    return format_response(result.data, "任務接取成功")


async def handle_submit_quest_proof(args):
    result = supabase.rpc("submit_quest_proof", {
        "p_adventurer_id": args["adventurer_id"],
        "p_quest_id": args["quest_id"],
        "p_proof_note": args.get("proof_note", "")
    }).execute()
    return format_response(result.data, "成果已提交，等待驗收")


async def handle_release_quest_escrow(args):
    result = supabase.rpc("release_quest_escrow", {
        "p_client_id": args["client_id"],
        "p_quest_id": args["quest_id"]
    }).execute()
    return format_response(result.data, "託管金已釋放")


async def handle_cancel_quest(args):
    result = supabase.rpc("cancel_quest_escrow", {
        "p_client_id": args["client_id"],
        "p_quest_id": args["quest_id"],
        "p_cancel_reason": args.get("reason", "")
    }).execute()
    return format_response(result.data, "任務已取消，G 幣已退還")


async def handle_get_profile(args):
    result = supabase.table("users").select(
        "id,display_name,balance_g_coin,frozen_g_coin,"
        "reputation_points,skill_tags,bio,created_at"
    ).eq("id", args["user_id"]).single().execute()
    return format_response(result.data, "冒險者資料")


async def handle_post_quest(args):
    import uuid
    result = supabase.rpc("create_quest_escrow", {
        "p_client_id": args["client_id"],
        "p_idempotency_key": str(uuid.uuid4()),
        "p_reward": args["reward"],
        "p_title": args["title"],
        "p_description": args["description"],
        "p_category": args.get("category", "daily")
    }).execute()
    return format_response(result.data, "任務已發布，G 幣已凍結")


def format_response(data, message=""):
    return [TextContent(type="text", text=json.dumps({
        "ok": True,
        "message": message,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "data": data
    }, ensure_ascii=False, indent=2))]


# === 啟動 ===
async def main():
    async with stdio_server() as (read, write):
        await server.run(read, write, server.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
