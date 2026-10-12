#!/usr/bin/env python3
"""
Tests for the MCP server (project_source/mcp_server/server.py).

Covers the Model Context Protocol JSON-RPC 2.0 endpoint (/mcp):
  * initialize handshake
  * tools/list with schemas
  * tools/call (success, unknown tool, failing tool)
  * ping / notifications
  * unknown method error (-32601), invalid request (-32600)
  * optional API-key auth
plus the legacy REST surface (/health, /api/tools, /api/tools/<name>/execute, /api/execute).

Run: python tests/test_mcp_server.py
"""

import sys
import os
import json
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
os.chdir(sys.path[0])
MCP_DIR = os.path.join(os.getcwd(), "project_source", "mcp_server")
sys.path.insert(0, MCP_DIR)

from server import MCPServer  # noqa: E402

CONFIG_PATH = os.path.join(MCP_DIR, "mcp_config.json")

PASS = 0
FAIL = 0


def t(name, fn):
    global PASS, FAIL
    try:
        fn()
        PASS += 1
        print(f"  OK  {name}")
    except AssertionError as e:
        FAIL += 1
        print(f"FAIL  {name}: {e}")
    except Exception as e:
        FAIL += 1
        print(f"ERROR {name}: {type(e).__name__}: {e}")


server = MCPServer(config_path=CONFIG_PATH)
client = server.app.test_client()

# ---------------------------------------------------------------------------
# Legacy REST surface
# ---------------------------------------------------------------------------
def test_health():
    r = client.get("/health")
    assert r.status_code == 200, r.status_code
    data = r.get_json()
    assert data["status"] == "healthy"
    assert data["tools"] > 100, f"expected >100 registered tools, got {data['tools']}"
    assert data["uptime"] >= 0


def test_api_tools_list():
    r = client.get("/api/tools")
    assert r.status_code == 200
    tools = r.get_json()
    names = {x["name"] for x in tools}
    for expected in ("filesystem", "sqlite", "calculator", "time", "git", "github", "weather"):
        assert expected in names, f"tool {expected} not registered"
    fs = next(x for x in tools if x["name"] == "filesystem")
    assert fs["enabled"] is True
    assert "read" in fs["capabilities"]


def test_api_tool_execute():
    r = client.post("/api/tools/calculator/execute", json={
        "capability": "eval",
        "parameters": {"expression": "2+3*4"},
    })
    assert r.status_code == 200
    data = r.get_json()
    assert data["success"] is True, data
    assert data["result"]["result"] == 14
    assert data["tool_name"] == "calculator"


def test_api_execute_any():
    r = client.post("/api/execute", json={
        "tool": "time", "capability": "now", "parameters": {},
    })
    assert r.status_code == 200
    data = r.get_json()
    assert data["success"] is True, data
    assert "iso" in data["result"]

    r2 = client.post("/api/execute", json={"tool": "does_not_exist"})
    assert r2.status_code == 404


def test_api_tool_not_found():
    r = client.get("/api/tools/nope")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# MCP protocol endpoint
# ---------------------------------------------------------------------------
def test_mcp_info_get():
    r = client.get("/mcp")
    assert r.status_code == 200
    data = r.get_json()
    assert data["protocol"] == "json-rpc/2.0"
    assert data["mcpVersion"] == MCPServer.MCP_PROTOCOL_VERSION
    assert data["tools"] > 100


def test_mcp_initialize():
    r = client.post("/mcp", json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-06-18",
            "capabilities": {},
            "clientInfo": {"name": "test-client", "version": "1.0"},
        },
    })
    assert r.status_code == 200
    data = r.get_json()
    assert data["jsonrpc"] == "2.0"
    assert data["id"] == 1
    result = data["result"]
    assert result["protocolVersion"] == MCPServer.MCP_PROTOCOL_VERSION
    assert "tools" in result["capabilities"]
    assert result["serverInfo"]["version"] == "2.0.0"


def test_mcp_ping():
    r = client.post("/mcp", json={"jsonrpc": "2.0", "id": 2, "method": "ping"})
    assert r.status_code == 200
    data = r.get_json()
    assert data["id"] == 2
    assert data["result"] == {}


def test_mcp_tools_list():
    r = client.post("/mcp", json={"jsonrpc": "2.0", "id": 3, "method": "tools/list"})
    assert r.status_code == 200
    tools = r.get_json()["result"]["tools"]
    names = {x["name"] for x in tools}
    for expected in ("filesystem", "calculator", "git", "github", "weather", "time"):
        assert expected in names, f"{expected} missing from tools/list"
    fs = next(x for x in tools if x["name"] == "filesystem")
    schema = fs["inputSchema"]
    assert schema["type"] == "object"
    assert "capability" in schema["properties"]
    assert "enum" in schema["properties"]["capability"]
    assert "parameters" in schema["properties"]


def test_mcp_tools_call_success():
    r = client.post("/mcp", json={
        "jsonrpc": "2.0", "id": 4, "method": "tools/call",
        "params": {"name": "calculator", "arguments": {"capability": "eval", "parameters": {"expression": "7*6"}}},
    })
    assert r.status_code == 200
    data = r.get_json()
    assert data["id"] == 4
    result = data["result"]
    assert result["isError"] is False
    assert result["content"][0]["type"] == "text"
    assert '"result": 42' in result["content"][0]["text"]
    assert result["toolName"] == "calculator"


def test_mcp_tools_call_text_tool():
    r = client.post("/mcp", json={
        "jsonrpc": "2.0", "id": 5, "method": "tools/call",
        "params": {"name": "text", "arguments": {"capability": "hash", "parameters": {"text": "hello"}}},
    })
    assert r.status_code == 200
    result = r.get_json()["result"]
    assert result["isError"] is False
    text = result["content"][0]["text"]
    assert "5d41402abc4b2a76b9719d911017c592" in text  # md5("hello")


def test_mcp_tools_call_unknown_tool():
    r = client.post("/mcp", json={
        "jsonrpc": "2.0", "id": 6, "method": "tools/call",
        "params": {"name": "ghost", "arguments": {}},
    })
    assert r.status_code == 200
    data = r.get_json()
    assert data["error"]["code"] == -32602
    assert "ghost" in data["error"]["message"]


def test_mcp_tools_call_failing_tool():
    # Unknown capability -> tool returns isError=true (surfaced, not a transport error)
    r = client.post("/mcp", json={
        "jsonrpc": "2.0", "id": 7, "method": "tools/call",
        "params": {"name": "calculator", "arguments": {"capability": "bogus", "parameters": {}}},
    })
    assert r.status_code == 200
    result = r.get_json()["result"]
    assert result["isError"] is True


def test_mcp_resources_list():
    r = client.post("/mcp", json={"jsonrpc": "2.0", "id": 8, "method": "resources/list"})
    assert r.status_code == 200
    assert r.get_json()["result"] == {"resources": []}


def test_mcp_notification_no_body():
    r = client.post("/mcp", json={"jsonrpc": "2.0", "method": "notifications/initialized"})
    assert r.status_code == 202


def test_mcp_unknown_method():
    r = client.post("/mcp", json={"jsonrpc": "2.0", "id": 9, "method": "bogus/method"})
    assert r.status_code == 200
    data = r.get_json()
    assert data["error"]["code"] == -32601
    assert "bogus/method" in data["error"]["message"]


def test_mcp_invalid_request():
    r = client.post("/mcp", json={"id": "no-jsonrpc"})
    assert r.status_code == 200
    assert r.get_json()["error"]["code"] == -32600

    r2 = client.post("/mcp", data="not json", content_type="text/plain")
    assert r2.status_code == 200
    assert r2.get_json()["error"]["code"] == -32700


def test_mcp_auth_enforced():
    # Build a server with auth required and check the gate.
    config = json.load(open(CONFIG_PATH, "r", encoding="utf-8"))
    config["security"]["auth_required"] = True
    config["security"]["api_key"] = "test-secret"
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump(config, f)
        cfg_path = f.name
    try:
        auth_server = MCPServer(config_path=cfg_path)
        auth_client = auth_server.app.test_client()
        r = auth_client.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "ping"})
        assert r.status_code == 401, r.status_code
        r2 = auth_client.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "ping"},
                              headers={"Authorization": "Bearer test-secret"})
        assert r2.status_code == 200
        assert r2.get_json()["result"] == {}
    finally:
        os.remove(cfg_path)


def main():
    tests = [
        ("health endpoint", test_health),
        ("REST /api/tools list", test_api_tools_list),
        ("REST tool execute", test_api_tool_execute),
        ("REST /api/execute dispatch", test_api_execute_any),
        ("REST unknown tool 404", test_api_tool_not_found),
        ("MCP GET info", test_mcp_info_get),
        ("MCP initialize handshake", test_mcp_initialize),
        ("MCP ping", test_mcp_ping),
        ("MCP tools/list schemas", test_mcp_tools_list),
        ("MCP tools/call calculator", test_mcp_tools_call_success),
        ("MCP tools/call text tool", test_mcp_tools_call_text_tool),
        ("MCP tools/call unknown tool", test_mcp_tools_call_unknown_tool),
        ("MCP tools/call failing tool", test_mcp_tools_call_failing_tool),
        ("MCP resources/list", test_mcp_resources_list),
        ("MCP notification no body", test_mcp_notification_no_body),
        ("MCP unknown method -32601", test_mcp_unknown_method),
        ("MCP invalid request -32600/-32700", test_mcp_invalid_request),
        ("MCP optional API-key auth", test_mcp_auth_enforced),
    ]
    print("MCP Server tests:")
    for name, fn in tests:
        t(name, fn)
    total = PASS + FAIL
    print(f"\nMCP Server: {PASS}/{total} passed")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())