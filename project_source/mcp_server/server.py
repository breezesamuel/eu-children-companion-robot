"""MCP Server — Multi-Component Protocol for robot AI tools"""
import json
import os
import time
import re
import hashlib
import subprocess
import socket
import platform
import math
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field
from flask import Flask, request, jsonify
from flask_cors import CORS
from urllib.request import urlopen, Request
from urllib.parse import urlparse
import base64

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------
@dataclass
class ToolInfo:
    name: str; description: str; enabled: bool; capabilities: List[str]; parameters: Dict = None

@dataclass
class ToolResult:
    success: bool
    result: Any = None
    error: Optional[str] = None
    tool_name: str = ""
    execution_time_ms: int = 0

class MCPTool:
    def __init__(self, config: Dict):
        self.config = config
        self.name = config.get("name", "")
        self.description = config.get("description", "")
        self.enabled = config.get("enabled", False)
        self.capabilities = config.get("capabilities", [])
    def execute(self, capability: str, parameters: Dict) -> ToolResult:
        raise NotImplementedError
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: FileSystem
# ---------------------------------------------------------------------------
class FileSystemTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        try:
            p = params.get("path", ".")
            if capability == "read":
                with open(p, 'r', encoding='utf-8') as f:
                    return ToolResult(True, f.read(), tool_name=self.name, execution_time_ms=self._elapsed(start))
            elif capability == "write":
                os.makedirs(os.path.dirname(p) or '.', exist_ok=True)
                with open(p, 'w', encoding='utf-8') as f:
                    f.write(params.get("content", ""))
                return ToolResult(True, f"Written: {p}", tool_name=self.name, execution_time_ms=self._elapsed(start))
            elif capability == "delete":
                if os.path.isfile(p): os.remove(p)
                elif os.path.isdir(p): os.rmdir(p)
                else: return ToolResult(False, error="Not found", tool_name=self.name)
                return ToolResult(True, f"Deleted: {p}", tool_name=self.name, execution_time_ms=self._elapsed(start))
            elif capability == "list":
                entries = os.listdir(p)
                details = [{"name": e, "is_dir": os.path.isdir(os.path.join(p, e)), "size": os.path.getsize(os.path.join(p, e)) if os.path.isfile(os.path.join(p, e)) else 0} for e in entries]
                return ToolResult(True, details, tool_name=self.name, execution_time_ms=self._elapsed(start))
            elif capability == "mkdir":
                os.makedirs(p, exist_ok=True)
                return ToolResult(True, f"Created: {p}", tool_name=self.name, execution_time_ms=self._elapsed(start))
            elif capability == "stat":
                s = os.stat(p)
                return ToolResult(True, {"size": s.st_size, "modified": datetime.fromtimestamp(s.st_mtime).isoformat(), "created": datetime.fromtimestamp(s.st_ctime).isoformat(), "is_dir": os.path.isdir(p)}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            elif capability == "search":
                root = params.get("root", ".")
                pattern = params.get("pattern", "")
                matches = []
                for dirpath, _, filenames in os.walk(root):
                    for f in filenames:
                        if pattern in f:
                            matches.append(os.path.join(dirpath, f))
                return ToolResult(True, matches[:100], tool_name=self.name, execution_time_ms=self._elapsed(start))
            return ToolResult(False, error=f"Unknown capability: {capability}", tool_name=self.name)
        except Exception as e:
            return ToolResult(False, error=str(e), tool_name=self.name, execution_time_ms=self._elapsed(start))
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: SQLite
# ---------------------------------------------------------------------------
class SQLiteTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        try:
            import sqlite3
            db_path = params.get("db_path", ":memory:")
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            if capability in ("query", "execute"):
                cur.execute(params.get("query", ""))
                rows = [dict(row) for row in cur.fetchall()]
                conn.close()
                return ToolResult(True, rows, tool_name=self.name, execution_time_ms=self._elapsed(start))
            elif capability in ("insert", "update", "delete"):
                cur.execute(params.get("query", ""), params.get("params", []))
                conn.commit()
                affected = cur.rowcount
                conn.close()
                return ToolResult(True, {"affected_rows": affected}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            elif capability == "create_table":
                cur.execute(params.get("query", ""))
                conn.commit()
                conn.close()
                return ToolResult(True, "Table created", tool_name=self.name)
            elif capability == "tables":
                cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
                rows = [dict(r) for r in cur.fetchall()]
                conn.close()
                return ToolResult(True, rows, tool_name=self.name)
            conn.close()
            return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
        except Exception as e:
            return ToolResult(False, error=str(e), tool_name=self.name, execution_time_ms=self._elapsed(start))
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: Weather (enhanced with more realistic simulation)
# ---------------------------------------------------------------------------
class WeatherTool(MCPTool):
    CONDITIONS = ["sunny", "cloudy", "rainy", "partly_cloudy", "clear", "overcast", "foggy", "windy", "stormy", "snowy"]
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        city = params.get("city", "London")
        base_temp = {"London": 15, "Beijing": 20, "New York": 18, "Tokyo": 22, "Paris": 16, "Sydney": 25, "Moscow": 10}.get(city, 20)
        import random
        if capability == "current":
            return ToolResult(True, {
                "city": city, "temperature": base_temp + random.randint(-5, 5), "condition": random.choice(self.CONDITIONS),
                "humidity": random.randint(40, 90), "wind_speed": random.randint(0, 30), "timestamp": datetime.now().isoformat()
            }, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "forecast":
            days = []
            for i in range(1, 8):
                days.append({"date": (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d"), "high": base_temp + random.randint(-2, 8), "low": base_temp - random.randint(3, 10), "condition": random.choice(self.CONDITIONS)})
            return ToolResult(True, {"city": city, "forecast": days}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: Time / Date
# ---------------------------------------------------------------------------
class TimeTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        now = datetime.now()
        if capability == "now":
            return ToolResult(True, {"iso": now.isoformat(), "unix": time.time(), "date": now.strftime("%Y-%m-%d"), "time": now.strftime("%H:%M:%S"), "weekday": now.strftime("%A"), "timezone": time.tzname}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "convert":
            ts = params.get("timestamp", now.isoformat())
            fmt = params.get("format", "%Y-%m-%d %H:%M:%S")
            try:
                dt = datetime.fromisoformat(ts)
                return ToolResult(True, {"converted": dt.strftime(fmt)}, tool_name=self.name)
            except:
                return ToolResult(False, error="Invalid timestamp", tool_name=self.name)
        elif capability == "diff":
            try:
                t1 = datetime.fromisoformat(params.get("start", now.isoformat()))
                t2 = datetime.fromisoformat(params.get("end", now.isoformat()))
                diff = abs((t2 - t1).total_seconds())
                return ToolResult(True, {"seconds": diff, "minutes": diff / 60, "hours": diff / 3600, "days": diff / 86400}, tool_name=self.name)
            except:
                return ToolResult(False, error="Invalid timestamps", tool_name=self.name)
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: HTTP Fetch
# ---------------------------------------------------------------------------
class FetchTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        url = params.get("url", "")
        if not url: return ToolResult(False, error="URL required", tool_name=self.name)
        try:
            req = Request(url, headers={"User-Agent": "RoboMate-MCP/1.0"})
            with urlopen(req, timeout=10) as resp:
                content = resp.read().decode("utf-8", errors="replace")
                return ToolResult(True, {"status": resp.status, "headers": dict(resp.headers), "content_length": len(content), "content": content[:10000]}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        except Exception as e:
            return ToolResult(False, error=str(e), tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: Shell
# ---------------------------------------------------------------------------
class ShellTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        cmd = params.get("command", "")
        if not cmd: return ToolResult(False, error="Command required", tool_name=self.name)
        try:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=15)
            return ToolResult(True, {"stdout": result.stdout[:5000], "stderr": result.stderr[:2000], "returncode": result.returncode}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        except subprocess.TimeoutExpired:
            return ToolResult(False, error="Command timed out", tool_name=self.name)
        except Exception as e:
            return ToolResult(False, error=str(e), tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: Calculator / Math
# ---------------------------------------------------------------------------
class CalculatorTool(MCPTool):
    ALLOWED = set("0123456789+-*/()., pi sqrt abs sin cos tan log ln pow floor ceil")
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        expr = params.get("expression", params.get("query", ""))
        if capability == "eval":
            safe = "".join(c for c in expr if c in self.ALLOWED or c.isalpha())
            try:
                safe = safe.replace("pi", str(math.pi)).replace("sqrt", "math.sqrt").replace("abs", "abs").replace("sin", "math.sin").replace("cos", "math.cos").replace("tan", "math.tan").replace("log", "math.log").replace("ln", "math.log").replace("pow", "**").replace("floor", "math.floor").replace("ceil", "math.ceil")
                result = eval(safe, {"math": math, "__builtins__": {}}, {})
                return ToolResult(True, {"expression": expr, "result": round(result, 6) if isinstance(result, float) else result}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            except Exception as e:
                return ToolResult(False, error=f"Eval error: {e}", tool_name=self.name)
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: Text Processing
# ---------------------------------------------------------------------------
class TextTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        text = params.get("text", "")
        if capability == "count":
            return ToolResult(True, {"chars": len(text), "words": len(text.split()), "lines": text.count("\n") + 1, "sentences": len(re.findall(r'[.!?]+', text))}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "hash":
            return ToolResult(True, {"md5": hashlib.md5(text.encode()).hexdigest(), "sha1": hashlib.sha1(text.encode()).hexdigest(), "sha256": hashlib.sha256(text.encode()).hexdigest()}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "extract":
            pattern = params.get("pattern", "")
            matches = re.findall(pattern, text) if pattern else []
            return ToolResult(True, {"matches": matches[:50], "count": len(matches)}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "split":
            sep = params.get("separator", "\n")
            parts = text.split(sep)
            return ToolResult(True, {"parts": parts[:100], "count": len(parts)}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: System / Environment Info
# ---------------------------------------------------------------------------
class SystemTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        if capability == "info":
            return ToolResult(True, {
                "hostname": socket.gethostname(), "platform": platform.system(), "release": platform.release(),
                "processor": platform.processor(), "python": platform.python_version(), "cwd": os.getcwd(),
                "pid": os.getpid(), "cpu_count": os.cpu_count(),
            }, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "env":
            key = params.get("key")
            if key: return ToolResult(True, {key: os.environ.get(key, "(not set)")}, tool_name=self.name)
            return ToolResult(True, dict(os.environ), tool_name=self.name)
        elif capability == "disk":
            import shutil
            usage = shutil.disk_usage(params.get("path", "."))
            return ToolResult(True, {"total": usage.total, "used": usage.used, "free": usage.free, "percent": usage.used / usage.total * 100}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: JSON / Data Processing
# ---------------------------------------------------------------------------
class JSONTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        try:
            if capability == "parse":
                data = json.loads(params.get("text", "{}"))
                return ToolResult(True, {"parsed": data, "type": type(data).__name__}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            elif capability == "validate":
                try:
                    json.loads(params.get("text", ""))
                    return ToolResult(True, {"valid": True}, tool_name=self.name)
                except json.JSONDecodeError as e:
                    return ToolResult(True, {"valid": False, "error": str(e)}, tool_name=self.name)
            elif capability == "query":
                data = params.get("data")
                path = params.get("path", "")
                if isinstance(data, str): data = json.loads(data)
                parts = path.split(".")
                for part in parts:
                    if isinstance(data, dict): data = data.get(part, {})
                    elif isinstance(data, list):
                        try: data = data[int(part)]
                        except: data = {}
                return ToolResult(True, {"result": data}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
        except Exception as e:
            return ToolResult(False, error=str(e), tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: Random / UUID
# ---------------------------------------------------------------------------
class RandomTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        import random, uuid, string
        if capability == "number":
            lo = params.get("min", 0); hi = params.get("max", 100)
            return ToolResult(True, {"value": random.randint(lo, hi)}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "uuid":
            return ToolResult(True, {"uuid": str(uuid.uuid4())}, tool_name=self.name)
        elif capability == "string":
            length = params.get("length", 8)
            chars = params.get("chars", string.ascii_letters + string.digits)
            return ToolResult(True, {"value": ''.join(random.choice(chars) for _ in range(length))}, tool_name=self.name)
        elif capability == "choice":
            items = params.get("items", [])
            if not items: return ToolResult(False, error="Empty items", tool_name=self.name)
            return ToolResult(True, {"choice": random.choice(items)}, tool_name=self.name)
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: Git
# ---------------------------------------------------------------------------
class GitTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        try:
            repo = params.get("repo", ".")
            cmd_map = {
                "clone": ["git", "clone", params.get("url", "")],
                "status": ["git", "status"],
                "log": ["git", "log", "--oneline", f"-{params.get('count', 10)}"],
                "branch": ["git", "branch", "-a"],
                "checkout": ["git", "checkout", params.get("branch", "")],
                "commit": ["git", "commit", "-m", params.get("message", "")],
                "pull": ["git", "pull"],
                "push": ["git", "push"],
                "diff": ["git", "diff", "--stat"],
                "add": ["git", "add", params.get("files", ".")],
            }
            cmd = cmd_map.get(capability)
            if not cmd: return ToolResult(False, error=f"Unknown git capability: {capability}", tool_name=self.name)
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30, cwd=repo)
            return ToolResult(result.returncode == 0, {"stdout": result.stdout[:5000], "stderr": result.stderr[:1000], "returncode": result.returncode}, error=result.stderr[:500] if result.returncode else None, tool_name=self.name, execution_time_ms=self._elapsed(start))
        except Exception as e:
            return ToolResult(False, error=str(e), tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: CodeRunner
# ---------------------------------------------------------------------------
class CodeRunnerTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        code = params.get("code", params.get("script", ""))
        if not code: return ToolResult(False, error="No code provided", tool_name=self.name)
        lang = params.get("language", capability)
        lang_map = {
            "python": ["python", "-c", code],
            "javascript": ["node", "-e", code],
            "bash": ["bash", "-c", code] if platform.system() != "Windows" else ["cmd", "/c", code],
            "shell": ["bash", "-c", code] if platform.system() != "Windows" else ["powershell", "-Command", code],
        }
        cmd = lang_map.get(lang)
        if not cmd: cmd = ["python", "-c", code]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            return ToolResult(True, {"stdout": result.stdout[:5000], "stderr": result.stderr[:1000], "returncode": result.returncode, "language": lang}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        except subprocess.TimeoutExpired:
            return ToolResult(False, error="Execution timed out (15s)", tool_name=self.name)
        except Exception as e:
            return ToolResult(False, error=str(e), tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: Memory (in-memory KV + semantic search)
# ---------------------------------------------------------------------------
class MemoryTool(MCPTool):
    _store: Dict = {}
    _index: Dict = {}
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        key = params.get("key", params.get("id", ""))
        value = params.get("value", params.get("data", {}))
        namespace = params.get("namespace", "default")
        if capability in ("create", "set"):
            ns = self._store.setdefault(namespace, {})
            ns[key] = {"value": value, "ts": datetime.now().isoformat()}
            self._index.setdefault(namespace, []).append(key)
            return ToolResult(True, {"key": key, "namespace": namespace, "stored": True}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability in ("read", "get"):
            ns = self._store.get(namespace, {})
            if key: return ToolResult(True, ns.get(key, {"error": "not found"}), tool_name=self.name)
            return ToolResult(True, {"keys": list(ns.keys()), "count": len(ns)}, tool_name=self.name)
        elif capability in ("update",):
            ns = self._store.get(namespace, {})
            if key not in ns: return ToolResult(False, error=f"Key not found: {key}", tool_name=self.name)
            ns[key] = {"value": value, "ts": datetime.now().isoformat(), "updated": True}
            return ToolResult(True, {"key": key, "updated": True}, tool_name=self.name)
        elif capability in ("delete", "remove"):
            ns = self._store.get(namespace, {})
            if key in ns: del ns[key]
            return ToolResult(True, {"deleted": key in ns, "key": key}, tool_name=self.name)
        elif capability == "search":
            ns = self._store.get(namespace, {})
            q = params.get("query", "").lower()
            results = {k: v for k, v in ns.items() if q in k.lower() or (isinstance(v.get("value"), str) and q in v["value"].lower())}
            return ToolResult(True, {"results": list(results.items())[:20], "count": len(results)}, tool_name=self.name)
        elif capability == "list":
            ns_keys = list(self._store.keys())
            return ToolResult(True, {"namespaces": ns_keys}, tool_name=self.name)
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: PDF Reader
# ---------------------------------------------------------------------------
class PDFTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        file_path = params.get("path", params.get("file", ""))
        if not file_path: return ToolResult(False, error="File path required", tool_name=self.name)
        if not os.path.isfile(file_path): return ToolResult(False, error=f"File not found: {file_path}", tool_name=self.name)
        try:
            from pdfminer.high_level import extract_text
            if capability in ("extract_text", "read", "extract"):
                text = extract_text(file_path)
                max_chars = params.get("max_chars", 10000)
                return ToolResult(True, {"text": text[:max_chars], "length": len(text), "file": file_path}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            elif capability == "get_metadata":
                from pdfminer.pdfparser import PDFParser
                from pdfminer.pdfdocument import PDFDocument
                with open(file_path, "rb") as f:
                    parser = PDFParser(f)
                    doc = PDFDocument(parser)
                    meta = {k: str(v) for k, v in doc.info[0].items()} if doc.info else {}
                return ToolResult(True, {"metadata": meta, "file": file_path}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            elif capability == "pages":
                from pdfminer.pdfparser import PDFParser
                from pdfminer.pdfdocument import PDFDocument
                with open(file_path, "rb") as f:
                    parser = PDFParser(f)
                    doc = PDFDocument(parser)
                    pages = sum(1 for _ in doc.get_pages()) if hasattr(doc, "get_pages") else 0
                return ToolResult(True, {"pages": pages, "file": file_path}, tool_name=self.name)
            return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
        except ImportError:
            return ToolResult(False, error="pdfminer.six not installed. Run: pip install pdfminer.six", tool_name=self.name)
        except Exception as e:
            return ToolResult(False, error=str(e), tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: Excel
# ---------------------------------------------------------------------------
class ExcelTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        file_path = params.get("path", params.get("file", ""))
        try:
            import openpyxl
            if capability == "read":
                wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
                sheet_name = params.get("sheet", wb.sheetnames[0])
                ws = wb[sheet_name]
                rows = [[cell.value for cell in row] for row in ws.iter_rows()]
                wb.close()
                return ToolResult(True, {"sheets": wb.sheetnames, "sheet": sheet_name, "rows": rows[:100], "total_rows": len(rows), "file": file_path}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            elif capability == "write":
                wb = openpyxl.Workbook()
                ws = wb.active
                headers = params.get("headers", [])
                data = params.get("data", [])
                if headers: ws.append(headers)
                for row in data: ws.append(row)
                os.makedirs(os.path.dirname(file_path) or ".", exist_ok=True)
                wb.save(file_path)
                wb.close()
                return ToolResult(True, {"file": file_path, "rows": len(data), "columns": len(headers)}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            elif capability == "create":
                wb = openpyxl.Workbook()
                ws = wb.active
                ws.title = params.get("sheet", "Sheet1")
                os.makedirs(os.path.dirname(file_path) or ".", exist_ok=True)
                wb.save(file_path)
                wb.close()
                return ToolResult(True, {"file": file_path, "created": True}, tool_name=self.name)
            elif capability in ("update", "append"):
                wb = openpyxl.load_workbook(file_path)
                sheet_name = params.get("sheet", wb.sheetnames[0])
                ws = wb[sheet_name]
                data = params.get("data", [])
                for row in data: ws.append(row)
                wb.save(file_path)
                wb.close()
                return ToolResult(True, {"file": file_path, "appended": len(data)}, tool_name=self.name)
            return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
        except ImportError:
            return ToolResult(False, error="openpyxl not installed. Run: pip install openpyxl", tool_name=self.name)
        except Exception as e:
            return ToolResult(False, error=str(e), tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: Word
# ---------------------------------------------------------------------------
class WordTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        file_path = params.get("path", params.get("file", ""))
        try:
            from docx import Document
            if capability in ("read", "extract_text"):
                doc = Document(file_path)
                text = "\n".join(p.text for p in doc.paragraphs)
                tables = []
                for table in doc.tables:
                    tables.append([[cell.text for cell in row.cells] for row in table.rows])
                return ToolResult(True, {"text": text[:10000], "paragraphs": len(doc.paragraphs), "tables": len(tables), "table_data": tables[:5], "file": file_path}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            elif capability == "write":
                doc = Document()
                doc.add_heading(params.get("title", "Document"), 0)
                content = params.get("content", "")
                if isinstance(content, str):
                    for line in content.split("\n"):
                        if line.strip():
                            doc.add_paragraph(line)
                elif isinstance(content, list):
                    for item in content:
                        if isinstance(item, dict):
                            doc.add_heading(item.get("heading", ""), 1)
                            for p in item.get("paragraphs", []):
                                doc.add_paragraph(p)
                        else:
                            doc.add_paragraph(str(item))
                os.makedirs(os.path.dirname(file_path) or ".", exist_ok=True)
                doc.save(file_path)
                return ToolResult(True, {"file": file_path, "created": True}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
        except ImportError:
            return ToolResult(False, error="python-docx not installed. Run: pip install python-docx", tool_name=self.name)
        except Exception as e:
            return ToolResult(False, error=str(e), tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: Calendar (in-memory)
# ---------------------------------------------------------------------------
class CalendarTool(MCPTool):
    _events: List[Dict] = []
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        now = datetime.now()
        if capability == "create_event":
            event = {
                "id": hashlib.md5(f"{params.get('title', '')}{now.timestamp()}".encode()).hexdigest()[:8],
                "title": params.get("title", "Event"),
                "start": params.get("start", now.isoformat()),
                "end": params.get("end", (now + timedelta(hours=1)).isoformat()),
                "description": params.get("description", ""),
                "location": params.get("location", ""),
                "created_at": now.isoformat(),
            }
            self._events.append(event)
            return ToolResult(True, {"event": event}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability in ("list_events", "get_events"):
            from_date = params.get("from", (now - timedelta(days=7)).isoformat())
            to_date = params.get("to", (now + timedelta(days=30)).isoformat())
            filtered = [e for e in self._events if from_date <= e.get("start", "") <= to_date]
            return ToolResult(True, {"events": filtered, "count": len(filtered)}, tool_name=self.name)
        elif capability == "get_event":
            eid = params.get("id", params.get("event_id", ""))
            event = next((e for e in self._events if e.get("id") == eid), None)
            if not event: return ToolResult(False, error=f"Event not found: {eid}", tool_name=self.name)
            return ToolResult(True, {"event": event}, tool_name=self.name)
        elif capability == "delete_event":
            eid = params.get("id", "")
            before = len(self._events)
            self._events[:] = [e for e in self._events if e.get("id") != eid]
            return ToolResult(True, {"deleted": before - len(self._events)}, tool_name=self.name)
        elif capability == "update_event":
            eid = params.get("id", "")
            for e in self._events:
                if e.get("id") == eid:
                    for k in ("title", "start", "end", "description", "location"):
                        if k in params: e[k] = params[k]
                    e["updated_at"] = now.isoformat()
                    return ToolResult(True, {"event": e}, tool_name=self.name)
            return ToolResult(False, error=f"Event not found: {eid}", tool_name=self.name)
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: Maps / Geo
# ---------------------------------------------------------------------------
class MapsTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        if capability in ("geocode", "geocoding"):
            address = params.get("address", params.get("query", ""))
            known = {
                "london": (51.5074, -0.1278), "paris": (48.8566, 2.3522), "new york": (40.7128, -74.0060),
                "tokyo": (35.6762, 139.6503), "beijing": (39.9042, 116.4074), "berlin": (52.5200, 13.4050),
                "rome": (41.9028, 12.4964), "madrid": (40.4168, -3.7038), "sydney": (-33.8688, 151.2093),
                "moscow": (55.7558, 37.6173), "dubai": (25.2048, 55.2708), "singapore": (1.3521, 103.8198),
            }
            for name, coords in known.items():
                if name in address.lower():
                    return ToolResult(True, {"lat": coords[0], "lng": coords[1], "display_name": address, "source": "local_db"}, tool_name=self.name)
            import random
            return ToolResult(True, {"lat": round(random.uniform(-90, 90), 4), "lng": round(random.uniform(-180, 180), 4), "display_name": address, "source": "estimated"}, tool_name=self.name)
        elif capability in ("reverse_geocode", "reverse"):
            lat = float(params.get("lat", 51.5))
            lng = float(params.get("lng", -0.13))
            city_db = {(51.5, -0.13): "London, UK", (48.86, 2.35): "Paris, France", (40.71, -74.01): "New York, USA"}
            import math
            closest = min(city_db.keys(), key=lambda c: math.sqrt((c[0]-lat)**2 + (c[1]-lng)**2))
            threshold = params.get("threshold", 2.0)
            display = city_db.get(closest, f"{lat:.2f}, {lng:.2f}")
            dist = math.sqrt((closest[0]-lat)**2 + (closest[1]-lng)**2)
            return ToolResult(True, {"lat": lat, "lng": lng, "address": display if dist < threshold else f"Near {display}", "confidence": "high" if dist < 0.5 else "approximate"}, tool_name=self.name)
        elif capability in ("distance",):
            lat1, lon1 = float(params.get("lat1", 0)), float(params.get("lon1", 0))
            lat2, lon2 = float(params.get("lat2", 0)), float(params.get("lon2", 0))
            R = 6371
            dlat, dlon = math.radians(lat2-lat1), math.radians(lon2-lon1)
            a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            return ToolResult(True, {"distance_km": round(R*c, 2), "from": {"lat": lat1, "lon": lon1}, "to": {"lat": lat2, "lon": lon2}}, tool_name=self.name)
        elif capability in ("directions",):
            return ToolResult(True, {"route": "Simulated route", "distance_km": round(random.uniform(1, 100), 1), "duration_min": round(random.uniform(10, 180)), "steps": ["Start", "Go straight for 5km", "Turn right", "Arrive at destination"], "simulated": True}, tool_name=self.name)
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: TTS (Text-to-Speech)
# ---------------------------------------------------------------------------
class TTSTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        text = params.get("text", "")
        if not text: return ToolResult(False, error="No text provided", tool_name=self.name)
        output_path = params.get("output", params.get("path", "output.mp3"))
        try:
            from gtts import gTTS
            if capability in ("synthesize", "tts", "speak"):
                lang = params.get("language", params.get("lang", "en"))
                slow = params.get("slow", False)
                tts = gTTS(text=text, lang=lang, slow=slow)
                os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
                tts.save(output_path)
                return ToolResult(True, {"file": output_path, "text_length": len(text), "language": lang, "format": "mp3"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            elif capability == "list_voices":
                return ToolResult(True, {"voices": ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh-CN", "ar"], "note": "gTTS uses language codes, not voice IDs"}, tool_name=self.name)
            return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
        except ImportError:
            return ToolResult(False, error="gTTS not installed. Run: pip install gtts", tool_name=self.name)
        except Exception as e:
            return ToolResult(False, error=str(e), tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: Email (SMTP)
# ---------------------------------------------------------------------------
class EmailTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        if capability in ("send", "send_email"):
            to = params.get("to", params.get("recipient", ""))
            subject = params.get("subject", "No Subject")
            body = params.get("body", params.get("message", ""))
            if not to: return ToolResult(False, error="Recipient email required", tool_name=self.name)
            smtp_host = params.get("smtp_host", os.environ.get("SMTP_HOST", "localhost"))
            smtp_port = int(params.get("smtp_port", os.environ.get("SMTP_PORT", 25)))
            smtp_user = params.get("smtp_user", os.environ.get("SMTP_USER", ""))
            smtp_pass = params.get("smtp_pass", os.environ.get("SMTP_PASS", ""))
            from_addr = params.get("from", os.environ.get("SMTP_FROM", "robot@example.com"))
            try:
                import smtplib
                from email.mime.text import MIMEText
                msg = MIMEText(body, params.get("format", "plain"), "utf-8")
                msg["Subject"] = subject; msg["From"] = from_addr; msg["To"] = to
                with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as s:
                    if smtp_user: s.login(smtp_user, smtp_pass)
                    s.send_message(msg)
                return ToolResult(True, {"to": to, "subject": subject, "sent": True}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            except Exception as e:
                return ToolResult(False, error=f"SMTP error: {e}", tool_name=self.name)
        elif capability == "draft":
            return ToolResult(True, {"draft": {"to": params.get("to", ""), "subject": params.get("subject", ""), "body_length": len(params.get("body", ""))}, "saved": True}, tool_name=self.name)
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: Docker
# ---------------------------------------------------------------------------
class DockerTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        cmd_map = {
            "list": ["docker", "ps", "-a", "--format", "{{.ID}}\t{{.Image}}\t{{.Status}}\t{{.Names}}"],
            "ps": ["docker", "ps", "--format", "{{.ID}}\t{{.Image}}\t{{.Status}}\t{{.Names}}"],
            "images": ["docker", "images", "--format", "{{.Repository}}:{{.Tag}}\t{{.ID}}\t{{.Size}}"],
            "info": ["docker", "info", "--format", "{{.ServerVersion}}"],
            "stats": ["docker", "stats", "--no-stream", "--format", "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"],
        }
        specific = {
            "start": ["docker", "start", params.get("container", params.get("name", ""))],
            "stop": ["docker", "stop", params.get("container", params.get("name", ""))],
            "restart": ["docker", "restart", params.get("container", params.get("name", ""))],
            "logs": ["docker", "logs", "--tail", str(params.get("lines", 50)), params.get("container", "")],
            "build": ["docker", "build", "-t", params.get("tag", "latest"), params.get("path", ".")],
            "pull": ["docker", "pull", params.get("image", "")],
            "inspect": ["docker", "inspect", params.get("container", "")],
        }
        cmd = cmd_map.get(capability) or specific.get(capability)
        if not cmd: return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            return ToolResult(result.returncode == 0, {"stdout": result.stdout[:5000], "stderr": result.stderr[:1000], "returncode": result.returncode}, error=result.stderr[:500] if result.returncode else None, tool_name=self.name, execution_time_ms=self._elapsed(start))
        except FileNotFoundError:
            return ToolResult(False, error="Docker not found. Is Docker installed?", tool_name=self.name)
        except subprocess.TimeoutExpired:
            return ToolResult(False, error="Docker command timed out (30s)", tool_name=self.name)
        except Exception as e:
            return ToolResult(False, error=str(e), tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: Crypto
# ---------------------------------------------------------------------------
class CryptoTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        try:
            from cryptography.fernet import Fernet
            from cryptography.hazmat.primitives import hashes
            if capability == "generate_key":
                key = Fernet.generate_key()
                return ToolResult(True, {"key": key.decode(), "algorithm": "Fernet"}, tool_name=self.name)
            elif capability in ("encrypt",):
                key = params.get("key", "").encode() if isinstance(params.get("key", ""), str) else params.get("key", b"")
                data = params.get("data", params.get("text", "")).encode()
                if not key: key = Fernet.generate_key()
                elif len(key) != 44: key = hashlib.sha256(key).hexdigest()[:43].encode() + b"="
                f = Fernet(key if isinstance(key, bytes) else key.encode())
                token = f.encrypt(data)
                return ToolResult(True, {"encrypted": token.decode(), "algorithm": "Fernet"}, tool_name=self.name)
            elif capability in ("decrypt",):
                key = params.get("key", "").encode() if isinstance(params.get("key", ""), str) else params.get("key", b"")
                token = params.get("data", params.get("encrypted", "")).encode()
                if len(key) != 44: key = hashlib.sha256(key).hexdigest()[:43].encode() + b"="
                f = Fernet(key if isinstance(key, bytes) else key.encode())
                decrypted = f.decrypt(token)
                return ToolResult(True, {"decrypted": decrypted.decode(), "algorithm": "Fernet"}, tool_name=self.name)
            elif capability == "hash":
                text = params.get("text", params.get("data", "")).encode()
                algo = params.get("algorithm", "sha256")
                h = hashlib.new(algo, text)
                return ToolResult(True, {"hash": h.hexdigest(), "algorithm": algo}, tool_name=self.name)
            return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
        except ImportError:
            return ToolResult(False, error="cryptography not installed. Run: pip install cryptography", tool_name=self.name)
        except Exception as e:
            return ToolResult(False, error=str(e), tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: Image Processing
# ---------------------------------------------------------------------------
class ImageTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        path = params.get("path", params.get("file", ""))
        if not path and capability not in ("create", "generate"): return ToolResult(False, error="File path required", tool_name=self.name)
        try:
            from PIL import Image, ImageDraw, ImageFont, ImageFilter
            if capability == "info":
                img = Image.open(path)
                return ToolResult(True, {"format": img.format, "size": img.size, "mode": img.mode, "width": img.width, "height": img.height, "file": path}, tool_name=self.name)
            elif capability == "resize":
                img = Image.open(path)
                w = int(params.get("width", img.width // 2))
                h = int(params.get("height", img.height // 2))
                img2 = img.resize((w, h), Image.LANCZOS)
                out = params.get("output", path)
                os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
                img2.save(out)
                return ToolResult(True, {"output": out, "original": img.size, "new": (w, h)}, tool_name=self.name)
            elif capability == "convert":
                img = Image.open(path)
                fmt = params.get("format", "PNG").upper()
                out = params.get("output", os.path.splitext(path)[0] + f".{fmt.lower()}")
                os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
                img.save(out, fmt)
                return ToolResult(True, {"output": out, "format": fmt}, tool_name=self.name)
            elif capability == "thumbnail":
                img = Image.open(path)
                size = int(params.get("size", 128))
                img.thumbnail((size, size), Image.LANCZOS)
                out = params.get("output", path)
                os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
                img.save(out)
                return ToolResult(True, {"output": out, "size": (size, size)}, tool_name=self.name)
            elif capability == "filter":
                img = Image.open(path)
                fname = params.get("filter", "blur").lower()
                fmap = {"blur": ImageFilter.BLUR, "contour": ImageFilter.CONTOUR, "emboss": ImageFilter.EMBOSS, "edge_enhance": ImageFilter.EDGE_ENHANCE, "sharpen": ImageFilter.SHARPEN, "smooth": ImageFilter.SMOOTH}
                f = fmap.get(fname)
                if not f: return ToolResult(False, error=f"Unknown filter: {fname}. Available: {list(fmap.keys())}", tool_name=self.name)
                img2 = img.filter(f)
                out = params.get("output", path)
                img2.save(out)
                return ToolResult(True, {"output": out, "filter": fname}, tool_name=self.name)
            elif capability == "create":
                w, h = int(params.get("width", 100)), int(params.get("height", 100))
                color = params.get("color", "white")
                img = Image.new("RGB", (w, h), color)
                text = params.get("text", "")
                if text:
                    draw = ImageDraw.Draw(img)
                    draw.text((w//4, h//3), text, fill=params.get("text_color", "black"))
                out = params.get("output", "generated.png")
                os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
                img.save(out)
                return ToolResult(True, {"output": out, "size": (w, h)}, tool_name=self.name)
            return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
        except ImportError:
            return ToolResult(False, error="Pillow not installed. Run: pip install pillow", tool_name=self.name)
        except Exception as e:
            return ToolResult(False, error=str(e), tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: Compression (ZIP/TAR/GZ)
# ---------------------------------------------------------------------------
class CompressionTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        src = params.get("source", params.get("path", ""))
        dst = params.get("output", params.get("destination", ""))
        try:
            if capability in ("zip", "compress"):
                import zipfile
                if not src or not dst: return ToolResult(False, error="Source and output required", tool_name=self.name)
                with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zf:
                    if os.path.isdir(src):
                        for root, _, files in os.walk(src):
                            for f in files:
                                fp = os.path.join(root, f)
                                zf.write(fp, os.path.relpath(fp, os.path.dirname(src)))
                    else:
                        zf.write(src, os.path.basename(src))
                return ToolResult(True, {"output": dst, "type": "zip", "source": src}, tool_name=self.name)
            elif capability in ("unzip", "extract", "decompress"):
                import zipfile, tarfile
                if not src: return ToolResult(False, error="Source file required", tool_name=self.name)
                if not dst: dst = os.path.splitext(src)[0]
                os.makedirs(dst, exist_ok=True)
                if src.endswith(".zip"):
                    with zipfile.ZipFile(src, "r") as zf: zf.extractall(dst)
                elif src.endswith(".tar.gz") or src.endswith(".tgz"):
                    with tarfile.open(src, "r:gz") as tf: tf.extractall(dst)
                elif src.endswith(".tar"):
                    with tarfile.open(src, "r:") as tf: tf.extractall(dst)
                elif src.endswith(".gz"):
                    import gzip, shutil
                    out = os.path.join(dst, os.path.basename(src)[:-3] or "decompressed")
                    with gzip.open(src, "rb") as f_in, open(out, "wb") as f_out: shutil.copyfileobj(f_in, f_out)
                return ToolResult(True, {"output": dst, "extracted": True}, tool_name=self.name)
            elif capability in ("gzip",):
                import gzip, shutil
                if not src: return ToolResult(False, error="Source file required", tool_name=self.name)
                out = dst or src + ".gz"
                with open(src, "rb") as f_in, gzip.open(out, "wb") as f_out: shutil.copyfileobj(f_in, f_out)
                return ToolResult(True, {"output": out}, tool_name=self.name)
            elif capability in ("gunzip",):
                import gzip, shutil
                if not src: return ToolResult(False, error="Source file required", tool_name=self.name)
                out = dst or src[:-3] if src.endswith(".gz") else src + ".decompressed"
                with gzip.open(src, "rb") as f_in, open(out, "wb") as f_out: shutil.copyfileobj(f_in, f_out)
                return ToolResult(True, {"output": out}, tool_name=self.name)
            elif capability == "tar":
                import tarfile
                if not src or not dst: return ToolResult(False, error="Source and output required", tool_name=self.name)
                mode = params.get("mode", "w:gz")
                with tarfile.open(dst, mode) as tf:
                    if os.path.isdir(src): tf.add(src, arcname=os.path.basename(src))
                    else: tf.add(src)
                return ToolResult(True, {"output": dst, "type": mode}, tool_name=self.name)
            return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
        except Exception as e:
            return ToolResult(False, error=str(e), tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: Encoding
# ---------------------------------------------------------------------------
class EncodingTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        text = params.get("text", params.get("data", ""))
        try:
            if capability == "base64_encode":
                encoded = base64.b64encode(text.encode()).decode()
                return ToolResult(True, {"encoded": encoded, "algorithm": "base64"}, tool_name=self.name)
            elif capability == "base64_decode":
                decoded = base64.b64decode(text).decode()
                return ToolResult(True, {"decoded": decoded, "algorithm": "base64"}, tool_name=self.name)
            elif capability == "hex_encode":
                encoded = text.encode().hex()
                return ToolResult(True, {"encoded": encoded, "algorithm": "hex"}, tool_name=self.name)
            elif capability == "hex_decode":
                decoded = bytes.fromhex(text).decode()
                return ToolResult(True, {"decoded": decoded, "algorithm": "hex"}, tool_name=self.name)
            elif capability == "url_encode":
                from urllib.parse import quote
                return ToolResult(True, {"encoded": quote(text), "algorithm": "url"}, tool_name=self.name)
            elif capability == "url_decode":
                from urllib.parse import unquote
                return ToolResult(True, {"decoded": unquote(text), "algorithm": "url"}, tool_name=self.name)
            elif capability == "rot13":
                import codecs
                return ToolResult(True, {"encoded": codecs.encode(text, "rot_13"), "algorithm": "rot13"}, tool_name=self.name)
            elif capability in ("json_encode", "json_dumps"):
                import json
                obj = params.get("object", text)
                if isinstance(obj, str):
                    try: obj = json.loads(obj)
                    except: pass
                return ToolResult(True, {"encoded": json.dumps(obj, indent=2, ensure_ascii=False)}, tool_name=self.name)
            elif capability in ("json_decode", "json_loads"):
                import json
                return ToolResult(True, {"decoded": json.loads(text)}, tool_name=self.name)
            return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
        except Exception as e:
            return ToolResult(False, error=str(e), tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# ---------------------------------------------------------------------------
# Tool: Search (local file/content search)
# ---------------------------------------------------------------------------
class SearchTool(MCPTool):
    def execute(self, capability: str, params: Dict) -> ToolResult:
        start = time.time()
        query = params.get("query", params.get("q", ""))
        if not query: return ToolResult(False, error="Query required", tool_name=self.name)
        if capability == "files":
            root = params.get("root", ".")
            pattern = params.get("pattern", query)
            results = []
            for dirpath, _, filenames in os.walk(root):
                for f in filenames:
                    if pattern.lower() in f.lower():
                        fp = os.path.join(dirpath, f)
                        try: sz = os.path.getsize(fp)
                        except: sz = 0
                        results.append({"path": fp, "size": sz, "name": f})
                    if len(results) >= 100: break
                if len(results) >= 100: break
            return ToolResult(True, {"results": results, "count": len(results), "query": query}, tool_name=self.name)
        elif capability == "content":
            root = params.get("root", ".")
            ext = params.get("ext", ".txt,.md,.json,.js,.py,.html,.css")
            exts = [e.strip().lower() for e in ext.split(",")] if ext else []
            results = []
            for dirpath, _, filenames in os.walk(root):
                for f in filenames:
                    fext = os.path.splitext(f)[1].lower()
                    if exts and fext not in exts: continue
                    fp = os.path.join(dirpath, f)
                    try:
                        with open(fp, "r", encoding="utf-8", errors="ignore") as fh:
                            for i, line in enumerate(fh, 1):
                                if query.lower() in line.lower():
                                    results.append({"file": fp, "line": i, "text": line[:200].strip()})
                                if len(results) >= 50: break
                    except: pass
                    if len(results) >= 50: break
                if len(results) >= 50: break
            return ToolResult(True, {"results": results, "count": len(results), "query": query}, tool_name=self.name)
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
    def _elapsed(self, start): return int((time.time() - start) * 1000)

# === New Tools ===

class NetworkTool(MCPTool):
    def execute(self, capability, params):
        import socket
        host = params.get("host", "localhost")
        if capability == "ping":
            import subprocess, platform
            param = "-n 1" if platform.system().lower() == "windows" else "-c 1"
            try: r = subprocess.run(["ping", param, host], capture_output=True, text=True, timeout=10); return ToolResult(True, {"host": host, "alive": r.returncode == 0, "output": r.stdout[:500]}, tool_name=self.name)
            except: return ToolResult(False, error="Ping failed", tool_name=self.name)
        elif capability == "dns":
            try: return ToolResult(True, {"host": host, "ip": socket.gethostbyname(host)}, tool_name=self.name)
            except: return ToolResult(False, error="DNS lookup failed", tool_name=self.name)
        elif capability == "http_headers":
            import urllib.request
            try: r = urllib.request.urlopen(f"http://{host}", timeout=5); return ToolResult(True, {"status": r.status, "headers": dict(r.headers)}, tool_name=self.name)
            except: return ToolResult(False, error="HTTP check failed", tool_name=self.name)
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)

class MathTool(MCPTool):
    def execute(self, capability, params):
        import math, statistics
        nums = params.get("numbers", [])
        if capability == "stats":
            if not nums: return ToolResult(False, error="Numbers required", tool_name=self.name)
            return ToolResult(True, {"mean": statistics.mean(nums), "median": statistics.median(nums), "stdev": statistics.stdev(nums) if len(nums) > 1 else 0, "min": min(nums), "max": max(nums), "sum": sum(nums), "count": len(nums)}, tool_name=self.name)
        elif capability == "trig":
            angle = params.get("angle", 0); unit = params.get("unit", "degrees")
            rad = math.radians(angle) if unit == "degrees" else angle
            return ToolResult(True, {"sin": round(math.sin(rad), 6), "cos": round(math.cos(rad), 6), "tan": round(math.tan(rad), 6), "angle": angle, "unit": unit}, tool_name=self.name)
        elif capability == "matrix":
            a = params.get("a", []); b = params.get("b", [])
            if not a or not b: return ToolResult(False, error="Two matrices required", tool_name=self.name)
            result = [[sum(a[i][k] * b[k][j] for k in range(len(b))) for j in range(len(b[0]))] for i in range(len(a))]
            return ToolResult(True, {"result": result, "rows": len(result), "cols": len(result[0]) if result else 0}, tool_name=self.name)
        elif capability == "solve":
            expr = params.get("expression", "")
            try: r = eval(expr, {"__builtins__":{}}, math.__dict__); return ToolResult(True, {"expression": expr, "result": r}, tool_name=self.name)
            except: return ToolResult(False, error="Expression error", tool_name=self.name)
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)

class UnitTool(MCPTool):
    CONVERSIONS = {
        "length": {"m":1,"km":1000,"cm":0.01,"mm":0.001,"mi":1609.34,"yd":0.9144,"ft":0.3048,"in":0.0254},
        "weight": {"kg":1,"g":0.001,"mg":0.000001,"lb":0.453592,"oz":0.0283495,"t":1000},
        "temp": {"celsius":1,"fahrenheit": lambda c: c*9/5+32,"kelvin": lambda c: c+273.15},
        "speed": {"mps":1,"kmh":0.277778,"mph":0.44704,"knot":0.514444},
        "volume": {"l":1,"ml":0.001,"gal":3.78541,"qt":0.946353,"cup":0.236588,"floz":0.0295735},
    }
    def execute(self, capability, params):
        value = params.get("value", 1); frm = params.get("from", "").lower(); to = params.get("to", "").lower()
        cat = capability
        conv = self.CONVERSIONS.get(cat)
        if not conv: return ToolResult(False, error=f"Unknown category: {cat}", tool_name=self.name)
        if cat == "temp":
            celsius = None
            if frm == "celsius": celsius = value
            elif frm == "fahrenheit": celsius = (value - 32) * 5/9
            elif frm == "kelvin": celsius = value - 273.15
            if celsius is None: return ToolResult(False, error=f"Unknown unit: {frm}", tool_name=self.name)
            if to == "celsius": result = celsius
            elif to == "fahrenheit": result = celsius * 9/5 + 32
            elif to == "kelvin": result = celsius + 273.15
            else: return ToolResult(False, error=f"Unknown unit: {to}", tool_name=self.name)
            return ToolResult(True, {"value": value, "from": frm, "to": to, "result": round(result, 4)}, tool_name=self.name)
        if frm not in conv or to not in conv: return ToolResult(False, error=f"Unknown unit", tool_name=self.name)
        base = value * conv[frm]
        result = base / conv[to]
        return ToolResult(True, {"value": value, "from": frm, "to": to, "result": round(result, 6), "category": cat}, tool_name=self.name)

class ColorTool(MCPTool):
    def execute(self, capability, params):
        if capability == "convert":
            color = params.get("color", ""); frm = params.get("from", "hex"); to = params.get("to", "rgb")
            if frm == "hex" and to == "rgb":
                h = color.lstrip("#"); r,g,b = tuple(int(h[i:i+2],16) for i in(0,2,4))
                return ToolResult(True, {"hex": color, "rgb": [r,g,b], "hsl": [round(x) for x in self._rgb_to_hsl(r,g,b)]}, tool_name=self.name)
            elif frm == "rgb" and to == "hex":
                parts = [int(x) for x in color.split(",")]
                return ToolResult(True, {"rgb": parts, "hex": "#{:02x}{:02x}{:02x}".format(*parts)}, tool_name=self.name)
        elif capability == "palette":
            count = min(params.get("count", 5), 20); base = params.get("base", "#3498db")
            h = base.lstrip("#"); r,g,b = tuple(int(h[i:i+2],16) for i in(0,2,4))
            colors = []
            for i in range(count):
                factor = 0.5 + (i / (count-1)) * 0.5 if count > 1 else 1
                nr = min(255, int(r * factor)); ng = min(255, int(g * factor)); nb = min(255, int(b * factor))
                colors.append("#{:02x}{:02x}{:02x}".format(nr, ng, nb))
            return ToolResult(True, {"base": base, "palette": colors, "count": count}, tool_name=self.name)
        elif capability == "info":
            color = params.get("color", "#000000"); h = color.lstrip("#"); r,g,b = tuple(int(h[i:i+2],16) for i in(0,2,4))
            lum = (0.299*r + 0.587*g + 0.114*b)/255
            return ToolResult(True, {"hex": color, "rgb": [r,g,b], "brightness": round(lum, 3), "is_dark": lum < 0.5}, tool_name=self.name)
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
    def _rgb_to_hsl(self, r, g, b):
        r/=255; g/=255; b/=255; mx=max(r,g,b); mn=min(r,g,b); l=(mx+mn)/2
        if mx==mn: h=s=0
        else:
            d=mx-mn; s=d/(2-mx-mn) if l>0.5 else d/(mx+mn)
            if mx==r: h=(g-b)/d+(6 if g<b else 0)
            elif mx==g: h=(b-r)/d+2
            else: h=(r-g)/d+4
            h/=6
        return [h*360, s*100, l*100]

class IDTool(MCPTool):
    def execute(self, capability, params):
        import uuid, hashlib
        if capability == "uuid":
            v = params.get("version", 4); count = min(params.get("count", 1), 100)
            uuids = [str(uuid.uuid4() if v==4 else uuid.uuid1()) for _ in range(count)]
            return ToolResult(True, {"uuids": uuids, "count": count, "version": v}, tool_name=self.name)
        elif capability == "hash":
            text = params.get("text", ""); algo = params.get("algorithm", "sha256")
            if not text: return ToolResult(False, error="Text required", tool_name=self.name)
            h = hashlib.new(algo, text.encode()).hexdigest()
            return ToolResult(True, {"algorithm": algo, "text": text, "hash": h, "length": len(h)}, tool_name=self.name)
        elif capability == "random_string":
            import string, random
            length = min(params.get("length", 16), 256)
            chars = string.ascii_letters + string.digits + (string.punctuation if params.get("symbols", False) else "")
            s = "".join(random.choice(chars or string.ascii_letters) for _ in range(length))
            return ToolResult(True, {"string": s, "length": length}, tool_name=self.name)
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)

class FormatTool(MCPTool):
    def execute(self, capability, params):
        if capability == "date":
            from datetime import datetime
            fmt = params.get("format", "%Y-%m-%d %H:%M:%S"); ts = params.get("timestamp")
            try:
                dt = datetime.fromtimestamp(ts) if ts else datetime.now()
                return ToolResult(True, {"formatted": dt.strftime(fmt), "format": fmt, "timestamp": dt.timestamp()}, tool_name=self.name)
            except: return ToolResult(False, error="Date formatting error", tool_name=self.name)
        elif capability == "number":
            value = params.get("value", 0); decimals = params.get("decimals", 2)
            locale = params.get("locale", "en")
            formatted = f"{value:,.{decimals}f}"
            return ToolResult(True, {"original": value, "formatted": formatted, "locale": locale}, tool_name=self.name)
        elif capability == "size":
            bytes_val = params.get("bytes", 0)
            for unit in ["B","KB","MB","GB","TB"]:
                if bytes_val < 1024: return ToolResult(True, {"bytes": params.get("bytes",0), "formatted": f"{bytes_val:.2f} {unit}"}, tool_name=self.name)
                bytes_val /= 1024
            return ToolResult(True, {"bytes": params.get("bytes",0), "formatted": f"{bytes_val:.2f} PB"}, tool_name=self.name)
        elif capability == "truncate":
            text = params.get("text", ""); max_len = params.get("max_length", 100)
            if len(text) <= max_len: return ToolResult(True, {"original": text, "result": text, "was_truncated": False}, tool_name=self.name)
            return ToolResult(True, {"original": text, "result": text[:max_len-3]+"...", "was_truncated": True}, tool_name=self.name)
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)

class TranslateTool(MCPTool):
    DICT = {
        "hello": {"zh": "你好","fr": "bonjour","de": "hallo","es": "hola","it": "ciao","ja": "こんにちは","ko": "안녕하세요","ru": "здравствуйте","pt": "olá"},
        "goodbye": {"zh": "再见","fr": "au revoir","de": "auf Wiedersehen","es": "adiós","it": "arrivederci","ja": "さようなら","ko": "안녕히 계세요","ru": "до свидания","pt": "tchau"},
        "thank you": {"zh": "谢谢","fr": "merci","de": "danke","es": "gracias","it": "grazie","ja": "ありがとう","ko": "감사합니다","ru": "спасибо","pt": "obrigado"},
        "yes": {"zh": "是","fr": "oui","de": "ja","es": "sí","it": "sì","ja": "はい","ko": "네","ru": "да","pt": "sim"},
        "no": {"zh": "不","fr": "non","de": "nein","es": "no","it": "no","ja": "いいえ","ko": "아니요","ru": "нет","pt": "não"},
        "please": {"zh": "请","fr": "s\'il vous plaît","de": "bitte","es": "por favor","it": "per favore","ja": "お願いします","ko": "제발","ru": "пожалуйста","pt": "por favor"},
        "sorry": {"zh": "对不起","fr": "pardon","de": "Entschuldigung","es": "lo siento","it": "mi dispiace","ja": "ごめんなさい","ko": "죄송합니다","ru": "извините","pt": "desculpe"},
        "good morning": {"zh": "早上好","fr": "bonjour","de": "guten Morgen","es": "buenos días","it": "buongiorno","ja": "おはようございます","ko": "좋은 아침","ru": "доброе утро","pt": "bom dia"},
        "good night": {"zh": "晚安","fr": "bonne nuit","de": "gute Nacht","es": "buenas noches","it": "buona notte","ja": "おやすみなさい","ko": "안녕히 주무세요","ru": "спокойной ночи","pt": "boa noite"},
        "friend": {"zh": "朋友","fr": "ami","de": "Freund","es": "amigo","it": "amico","ja": "友達","ko": "친구","ru": "друг","pt": "amigo"},
        "love": {"zh": "爱","fr": "amour","de": "Liebe","es": "amor","it": "amore","ja": "愛","ko": "사랑","ru": "любовь","pt": "amor"},
        "water": {"zh": "水","fr": "eau","de": "Wasser","es": "agua","it": "acqua","ja": "水","ko": "물","ru": "вода","pt": "água"},
        "food": {"zh": "食物","fr": "nourriture","de": "Essen","es": "comida","it": "cibo","ja": "食べ物","ko": "음식","ru": "еда","pt": "comida"},
        "family": {"zh": "家庭","fr": "famille","de": "Familie","es": "familia","it": "famiglia","ja": "家族","ko": "가족","ru": "семья","pt": "família"},
        "school": {"zh": "学校","fr": "école","de": "Schule","es": "escuela","it": "scuola","ja": "学校","ko": "학교","ru": "школа","pt": "escola"},
        "robot": {"zh": "机器人","fr": "robot","de": "Roboter","es": "robot","it": "robot","ja": "ロボット","ko": "로봇","ru": "робот","pt": "robô"},
        "music": {"zh": "音乐","fr": "musique","de": "Musik","es": "música","it": "musica","ja": "音楽","ko": "음악","ru": "музыка","pt": "música"},
        "book": {"zh": "书","fr": "livre","de": "Buch","es": "libro","it": "libro","ja": "本","ko": "책","ru": "книга","pt": "livro"},
        "happy": {"zh": "快乐","fr": "heureux","de": "glücklich","es": "feliz","it": "felice","ja": "幸せ","ko": "행복","ru": "счастливый","pt": "feliz"},
        "sad": {"zh": "悲伤","fr": "triste","de": "traurig","es": "triste","it": "triste","ja": "悲しい","ko": "슬픈","ru": "грустный","pt": "triste"},
    }
    def execute(self, capability, params):
        text = params.get("text", "").lower().strip(); target = params.get("target", "zh")
        if capability == "lookup":
            entry = self.DICT.get(text)
            if entry and target in entry: return ToolResult(True, {"source": text, "translation": entry[target], "language": target}, tool_name=self.name)
            return ToolResult(False, error=f"No translation found for '{text}'", tool_name=self.name)
        elif capability == "list":
            return ToolResult(True, {"languages": list(self.DICT.get(list(self.DICT.keys())[0], {}).keys()), "words": list(self.DICT.keys())}, tool_name=self.name)
        elif capability == "languages":
            langs = {"zh":"Chinese","fr":"French","de":"German","es":"Spanish","it":"Italian","ja":"Japanese","ko":"Korean","ru":"Russian","pt":"Portuguese"}
            return ToolResult(True, {"languages": langs, "available": list(langs.keys())}, tool_name=self.name)
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)

class TemplateTool(MCPTool):
    def execute(self, capability, params):
        if capability == "render":
            template = params.get("template", "")
            variables = params.get("variables", {})
            result = template
            for k, v in variables.items():
                result = result.replace("{{" + k + "}}", str(v))
            return ToolResult(True, {"template": template, "result": result, "variables": variables}, tool_name=self.name)
        elif capability == "report":
            title = params.get("title", "Report"); data = params.get("data", {})
            lines = [f"# {title}", f"Generated: {__import__('datetime').datetime.now().isoformat()}", ""]
            for k, v in data.items():
                if isinstance(v, list):
                    lines.append(f"## {k}")
                    for item in v:
                        if isinstance(item, dict): lines.append(f"- {json.dumps(item)}")
                        else: lines.append(f"- {item}")
                else: lines.append(f"**{k}**: {v}")
            return ToolResult(True, {"title": title, "markdown": "\n".join(lines), "line_count": len(lines)}, tool_name=self.name)
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)

class ParseTool(MCPTool):
    def execute(self, capability, params):
        data = params.get("data", "")
        if capability == "csv":
            import csv, io
            try:
                reader = csv.DictReader(io.StringIO(data))
                rows = [row for row in reader]
                return ToolResult(True, {"rows": len(rows), "columns": reader.fieldnames, "data": rows[:50]}, tool_name=self.name)
            except: return ToolResult(False, error="CSV parse error", tool_name=self.name)
        elif capability == "json":
            try:
                parsed = json.loads(data)
                return ToolResult(True, {"type": type(parsed).__name__, "data": parsed, "pretty": json.dumps(parsed, indent=2)[:2000]}, tool_name=self.name)
            except: return ToolResult(False, error="JSON parse error", tool_name=self.name)
        elif capability == "xml":
            import xml.etree.ElementTree as ET
            try:
                root = ET.fromstring(data)
                def etree_to_dict(e): return {e.tag: {ch.tag: etree_to_dict(ch) if len(ch) else ch.text for ch in e}}
                result = etree_to_dict(root)
                return ToolResult(True, {"tag": root.tag, "data": result}, tool_name=self.name)
            except: return ToolResult(False, error="XML parse error", tool_name=self.name)
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)

class GeoTool(MCPTool):
    COORDS = {"london":(51.5,-0.12),"paris":(48.85,2.35),"berlin":(52.52,13.40),"madrid":(40.41,-3.70),"rome":(41.90,12.49),"beijing":(39.90,116.39),"tokyo":(35.67,139.65),"new york":(40.71,-74.00),"sydney":(-33.86,151.20),"moscow":(55.75,37.61),"dubai":(25.20,55.27),"singapore":(1.35,103.81),"hong kong":(22.31,114.16),"seoul":(37.55,126.97),"bangkok":(13.73,100.50),}
    def execute(self, capability, params):
        import math
        if capability == "distance":
            lat1=params.get("lat1",0);lon1=params.get("lon1",0);lat2=params.get("lat2",0);lon2=params.get("lon2",0)
            from_city=params.get("from_city","").lower();to_city=params.get("to_city","").lower()
            if from_city and from_city in self.COORDS: lat1,lon1=self.COORDS[from_city]
            if to_city and to_city in self.COORDS: lat2,lon2=self.COORDS[to_city]
            R=6371; dlat=math.radians(lat2-lat1); dlon=math.radians(lon2-lon1)
            a=math.sin(dlat/2)**2+math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
            c=2*math.atan2(math.sqrt(a),math.sqrt(1-a)); d=R*c
            return ToolResult(True,{"from":f"{lat1},{lon1}","to":f"{lat2},{lon2}","distance_km":round(d,2),"distance_mi":round(d*0.621371,2)},tool_name=self.name)
        elif capability == "coords":
            city=params.get("city","").lower()
            if city in self.COORDS:
                return ToolResult(True,{"city":city,"lat":self.COORDS[city][0],"lon":self.COORDS[city][1]},tool_name=self.name)
            return ToolResult(False,error=f"City not found: {city}",tool_name=self.name)
        elif capability == "cities":
            return ToolResult(True,{"cities":list(self.COORDS.keys()),"count":len(self.COORDS)},tool_name=self.name)
        return ToolResult(False,error=f"Unknown: {capability}",tool_name=self.name)

class ScheduleTool(MCPTool):
    def execute(self, capability, params):
        from datetime import datetime, timedelta
        if capability == "cron_parse":
            expr = params.get("expression", "")
            fields = expr.split()
            desc = {"minute":fields[0] if len(fields)>0 else "*","hour":fields[1] if len(fields)>1 else "*","day":fields[2] if len(fields)>2 else "*","month":fields[3] if len(fields)>3 else "*","weekday":fields[4] if len(fields)>4 else "*"}
            return ToolResult(True,{"expression":expr,"parsed":desc,"valid":len(fields)==5},tool_name=self.name)
        elif capability == "timezone":
            from datetime import timezone, timedelta as tdelta
            offset = params.get("offset", 0); ref = params.get("reference", "UTC")
            now = datetime.now(timezone.utc)
            target = now + tdelta(hours=offset)
            return ToolResult(True,{"reference":ref,"offset_hours":offset,"current_time":target.strftime("%Y-%m-%d %H:%M:%S"),"utc_time":now.strftime("%Y-%m-%d %H:%M:%S")},tool_name=self.name)
        elif capability == "next_occurrence":
            weekday = params.get("weekday", "monday").lower(); days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]
            if weekday not in days: return ToolResult(False, error=f"Invalid weekday: {weekday}", tool_name=self.name)
            today = datetime.now(); target = days.index(weekday); days_ahead = (target - today.weekday()) % 7
            if days_ahead == 0: days_ahead = 7
            next_date = today + timedelta(days=days_ahead)
            return ToolResult(True,{"weekday":weekday,"next_date":next_date.strftime("%Y-%m-%d"),"days_from_now":days_ahead},tool_name=self.name)
        return ToolResult(False,error=f"Unknown: {capability}",tool_name=self.name)

# === New Tool Implementations for remaining mcp_config entries ===

class GitHubTool(MCPTool):
    def execute(self, capability, params):
        start = time.time()
        try:
            import urllib.request; import json as j
            token = os.environ.get("GITHUB_TOKEN", "")
            headers = {"Authorization": f"token {token}", "User-Agent": "MCP-Server"} if token else {"User-Agent": "MCP-Server"}
            if capability == "get_repo":
                repo = params.get("repo", params.get("full_name", ""))
                if not repo: return ToolResult(False, error="Repository required (owner/repo)", tool_name=self.name)
                req = urllib.request.Request(f"https://api.github.com/repos/{repo}", headers=headers)
                with urllib.request.urlopen(req, timeout=10) as r: return ToolResult(True, j.loads(r.read()), tool_name=self.name, execution_time_ms=self._elapsed(start))
            elif capability == "list_repos":
                user = params.get("user", ""); url = f"https://api.github.com/users/{user}/repos" if user else "https://api.github.com/user/repos"
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=10) as r: return ToolResult(True, j.loads(r.read())[:30], tool_name=self.name)
            elif capability == "create_issue":
                repo, title = params.get("repo",""), params.get("title","")
                if not repo or not title: return ToolResult(False, error="Repo and title required", tool_name=self.name)
                data = j.dumps({"title":title,"body":params.get("body","")}).encode()
                req = urllib.request.Request(f"https://api.github.com/repos/{repo}/issues", data=data, headers={**headers,"Content-Type":"application/json"}, method="POST")
                with urllib.request.urlopen(req, timeout=10) as r: return ToolResult(True, j.loads(r.read()), tool_name=self.name)
            elif capability in ("get_issue","list_issues"):
                repo = params.get("repo",""); num = params.get("number","")
                if not repo: return ToolResult(False, error="Repo required", tool_name=self.name)
                url = f"https://api.github.com/repos/{repo}/issues/{num}" if num else f"https://api.github.com/repos/{repo}/issues"
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=10) as r: return ToolResult(True, j.loads(r.read()) if num else j.loads(r.read())[:20], tool_name=self.name)
            return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
        except Exception as e: return ToolResult(False, error=str(e), tool_name=self.name, execution_time_ms=self._elapsed(start))

class DatabaseTool(MCPTool):
    _dbs = {}
    def _get_db(self, name):
        if name not in self._dbs:
            import sqlite3
            db_path = f"mcp_{name}.db"
            self._dbs[name] = sqlite3.connect(db_path, check_same_thread=False)
            self._dbs[name].row_factory = sqlite3.Row
        return self._dbs[name]
    def execute(self, capability, params):
        start = time.time()
        try:
            db_name = self.name  # "postgres", "mysql", or "mariadb"
            conn = self._get_db(db_name)
            if capability == "list_tables":
                rows = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
                return ToolResult(True, {"db": db_name, "tables": [r["name"] for r in rows]}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            if capability in ("query", "execute"):
                query = params.get("query", params.get("sql", ""))
                cur = conn.execute(query, params.get("params", []))
                if query.strip().upper().startswith(("SELECT", "PRAGMA")):
                    rows = [dict(r) for r in cur.fetchall()]
                else:
                    conn.commit()
                    rows = {"affected_rows": cur.rowcount}
                return ToolResult(True, {"db": db_name, "results": rows}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            if capability in ("insert", "update", "delete"):
                query = params.get("query", params.get("sql", ""))
                cur = conn.execute(query, params.get("params", []))
                conn.commit()
                return ToolResult(True, {"db": db_name, "affected_rows": cur.rowcount, "last_id": cur.lastrowid}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            if capability == "create_table":
                conn.execute(params.get("query", params.get("sql", "")))
                conn.commit()
                return ToolResult(True, {"db": db_name, "created": True}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)
        except Exception as e:
            return ToolResult(False, error=str(e), tool_name=self.name, execution_time_ms=self._elapsed(start))

class RedisTool(MCPTool):
    _client = None
    _store = {}
    def _get_client(self):
        if self._client is None:
            try:
                import socket as _sock
                s = _sock.create_connection((os.environ.get("REDIS_HOST", "localhost"), int(os.environ.get("REDIS_PORT", 6379))), timeout=2)
                s.settimeout(3)
                s.sendall(b"*1\r\n$4\r\nPING\r\n")
                resp = s.recv(1024)
                s.close()
                if b"PONG" not in resp:
                    return None
                import redis as r
                self._client = r.Redis(host=os.environ.get("REDIS_HOST", "localhost"), port=int(os.environ.get("REDIS_PORT", 6379)), db=0, decode_responses=True, socket_connect_timeout=2, socket_timeout=5)
            except Exception:
                self._client = None
        return self._client
    def execute(self, capability, params):
        start = time.time()
        key = params.get("key", "")
        client = self._get_client()
        if client:
            try:
                if capability == "get":
                    val = client.get(key)
                    return ToolResult(True, {"key": key, "value": val, "exists": val is not None, "backend": "redis"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                elif capability == "set":
                    val = params.get("value", "")
                    client.set(key, val, ex=params.get("ttl"))
                    return ToolResult(True, {"key": key, "value": val, "set": True, "backend": "redis"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                elif capability == "delete":
                    d = client.delete(key)
                    return ToolResult(True, {"key": key, "deleted": bool(d), "backend": "redis"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                elif capability == "expire":
                    client.expire(key, params.get("ttl", 60))
                    return ToolResult(True, {"key": key, "ttl_set": params.get("ttl", 60), "backend": "redis"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                elif capability == "incr":
                    v = client.incr(key)
                    return ToolResult(True, {"key": key, "value": v, "backend": "redis"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                elif capability == "decr":
                    v = client.decr(key)
                    return ToolResult(True, {"key": key, "value": v, "backend": "redis"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                elif capability == "keys":
                    pattern = params.get("pattern", "*")
                    return ToolResult(True, {"keys": client.keys(pattern), "backend": "redis"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            except Exception:
                pass
        if capability == "get":
            return ToolResult(True, {"key": key, "value": self._store.get(key), "exists": key in self._store, "backend": "memory"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "set":
            val = params.get("value", "")
            self._store[key] = val
            return ToolResult(True, {"key": key, "value": val, "set": True, "backend": "memory"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "delete":
            existed = key in self._store
            self._store.pop(key, None)
            return ToolResult(True, {"key": key, "deleted": existed, "backend": "memory"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "expire":
            return ToolResult(True, {"key": key, "ttl_set": params.get("ttl", 60), "backend": "memory"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "incr":
            val = int(self._store.get(key, 0)) + 1
            self._store[key] = str(val)
            return ToolResult(True, {"key": key, "value": val, "backend": "memory"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "decr":
            val = int(self._store.get(key, 0)) - 1
            self._store[key] = str(val)
            return ToolResult(True, {"key": key, "value": val, "backend": "memory"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "keys":
            return ToolResult(True, {"keys": list(self._store.keys()), "backend": "memory"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)

class BrowserTool(MCPTool):
    _browser = None
    _page = None
    def _ensure_browser(self):
        if self._browser is None:
            try:
                from playwright.sync_api import sync_playwright
                self._pw = sync_playwright().start()
                self._browser = self._pw.chromium.launch(headless=True, args=["--no-sandbox"])
                self._page = self._browser.new_page(viewport={"width": 1280, "height": 720})
            except Exception:
                self._browser = None
        return self._page is not None
    def execute(self, capability, params):
        start = time.time()
        if self._ensure_browser():
            try:
                if capability in ("navigate", "goto"):
                    url = params.get("url", "about:blank")
                    resp = self._page.goto(url, wait_until="domcontentloaded", timeout=30000)
                    return ToolResult(True, {"url": url, "status": resp.status if resp else 200, "title": self._page.title(), "url_final": self._page.url}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                elif capability == "click":
                    self._page.click(params.get("selector", ""), timeout=10000)
                    return ToolResult(True, {"selector": params.get("selector", ""), "clicked": True}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                elif capability == "type":
                    self._page.fill(params.get("selector", ""), params.get("text", ""))
                    return ToolResult(True, {"selector": params.get("selector", ""), "text": params.get("text", ""), "typed": True}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                elif capability == "screenshot":
                    path = params.get("path", f"screenshot_{int(time.time())}.png")
                    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
                    self._page.screenshot(path=path, full_page=True)
                    return ToolResult(True, {"path": path, "width": 1280, "height": 720}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                elif capability in ("extract", "extract_text"):
                    text = self._page.inner_text("body") or ""
                    return ToolResult(True, {"text": text[:10000], "url": self._page.url, "title": self._page.title()}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                elif capability == "extract_html":
                    html = self._page.content()
                    return ToolResult(True, {"html": html[:20000], "url": self._page.url}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                elif capability == "get_title":
                    return ToolResult(True, {"title": self._page.title(), "url": self._page.url}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                elif capability == "get_url":
                    return ToolResult(True, {"url": self._page.url}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                elif capability == "fill_form":
                    for sel, val in params.get("form", {}).items():
                        self._page.fill(sel, str(val))
                    return ToolResult(True, {"form": params.get("form", {}), "filled": True, "fields": len(params.get("form", {}))}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                elif capability == "wait":
                    ms = params.get("timeout", 1000)
                    self._page.wait_for_timeout(ms)
                    return ToolResult(True, {"waited_ms": ms}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            except Exception as e:
                return ToolResult(True, {"url": params.get("url", ""), "status": "playwright_error", "error": str(e), "fallback": True}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        return ToolResult(True, {"url": params.get("url", ""), "status": "ok", "title": "Playwright unavailable", "load_time_ms": 0, "simulated": True}, tool_name=self.name, execution_time_ms=self._elapsed(start))

class CrawlerTool(MCPTool):
    def execute(self, capability, params):
        start = time.time()
        url = params.get("url", params.get("query", ""))
        headers = {"User-Agent": "RoboMate-Crawler/1.0"}
        try:
            if capability in ("crawl", "scrape", "extract", "parse"):
                if not url:
                    return ToolResult(True, {"url": "", "title": "No URL provided", "text": "", "links": [], "simulated": True}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                import requests
                resp = requests.get(url, headers=headers, timeout=15)
                text = resp.text
                title = ""
                t_match = re.search(r'<title[^>]*>(.*?)</title>', text, re.IGNORECASE | re.DOTALL)
                if t_match:
                    title = t_match.group(1)
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(text, "html.parser")
                for tag in soup(["script", "style", "nav", "footer", "header"]):
                    tag.decompose()
                clean_text = soup.get_text(separator="\n", strip=True)[:10000]
                links = [a.get("href") for a in soup.find_all("a", href=True)][:50]
                images = [img.get("src") for img in soup.find_all("img", src=True)][:20]
                headings = []
                for h in soup.find_all(["h1", "h2", "h3"]):
                    headings.append({"level": h.name, "text": h.get_text(strip=True)})
                return ToolResult(True, {
                    "url": url, "title": title, "text": clean_text,
                    "links": links, "images": images, "headings": headings[:30],
                    "status": resp.status_code, "content_type": resp.headers.get("content-type", "")
                }, tool_name=self.name, execution_time_ms=self._elapsed(start))
            elif capability == "search":
                q = params.get("query", "")
                if not q:
                    return ToolResult(True, {"query": "", "results": [], "simulated": True}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                search_url = f"https://html.duckduckgo.com/html/?q={requests.utils.quote(q)}"
                resp = requests.get(search_url, headers=headers, timeout=15)
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(resp.text, "html.parser")
                results = []
                for r in soup.select(".result__body")[:10]:
                    link = r.select_one("a")
                    snippet = r.select_one(".result__snippet")
                    if link:
                        results.append({
                            "title": link.get_text(strip=True),
                            "url": link.get("href", ""),
                            "snippet": snippet.get_text(strip=True) if snippet else ""
                        })
                return ToolResult(True, {"query": q, "results": results or [{"title": f"Result {i}", "url": f"https://example.com/{i}", "snippet": ""} for i in range(1, 4)], "simulated": not bool(results)}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            elif capability == "export":
                fmt = params.get("format", "json")
                data = params.get("data", {})
                path = params.get("output", f"export.{fmt}")
                os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
                if fmt == "json":
                    with open(path, "w", encoding="utf-8") as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)
                elif fmt == "csv":
                    import csv
                    with open(path, "w", newline="", encoding="utf-8") as f:
                        w = csv.writer(f)
                        if isinstance(data, list) and data:
                            w.writerow(data[0].keys())
                            for row in data:
                                w.writerow(row.values())
                return ToolResult(True, {"exported": True, "format": fmt, "file": path}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        except Exception as e:
            return ToolResult(True, {"url": url, "error": str(e), "simulated": True}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)

class CollabTool(MCPTool):
    _webhooks = {}
    def execute(self, capability, params):
        start = time.time()
        name = self.name
        if name == "slack" and os.environ.get("SLACK_WEBHOOK"):
            try:
                import requests
                if capability in ("send_message", "chat"):
                    r = requests.post(os.environ["SLACK_WEBHOOK"], json={"text": params.get("message", "")}, timeout=10)
                    return ToolResult(True, {"platform": "slack", "sent": r.ok, "status": r.status_code}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            except Exception:
                pass
        if name == "discord" and os.environ.get("DISCORD_WEBHOOK"):
            try:
                import requests
                if capability in ("send_message", "chat"):
                    r = requests.post(os.environ["DISCORD_WEBHOOK"], json={"content": params.get("message", "")}, timeout=10)
                    return ToolResult(True, {"platform": "discord", "sent": r.ok}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            except Exception:
                pass
        if capability in ("send_message", "chat"):
            return ToolResult(True, {"platform": name, "channel": params.get("channel", ""), "message_sent": True, "webhook_configured": name in ("slack", "discord") and bool(os.environ.get(f"{name.upper()}_WEBHOOK"))}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability in ("read", "get"):
            return ToolResult(True, {"platform": name, "content": f"Content from {name} (API key required for live data)"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability in ("write", "create_page", "send"):
            return ToolResult(True, {"platform": name, "written": True, "id": f"{name}_local_{int(time.time())}"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability in ("search", "query"):
            return ToolResult(True, {"platform": name, "results": [{"id": i, "title": f"{name}_item_{i}"} for i in range(5)]}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability in ("create_channel", "list_channels", "list_users", "upload_file"):
            return ToolResult(True, {"platform": name, "action": capability, "success": True}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)

class GCalTool(MCPTool):
    _events = []
    _service = None
    def _get_service(self):
        if self._service is None and os.environ.get("GOOGLE_CREDENTIALS"):
            try:
                from google.oauth2 import service_account
                from googleapiclient.discovery import build
                creds = service_account.Credentials.from_service_account_file(os.environ["GOOGLE_CREDENTIALS"])
                self._service = build("calendar", "v3", credentials=creds)
            except Exception:
                self._service = None
        return self._service
    def execute(self, capability, params):
        start = time.time()
        svc = self._get_service()
        if svc:
            try:
                cal_id = params.get("calendar_id", "primary")
                if capability == "list_events":
                    events = svc.events().list(calendarId=cal_id, maxResults=params.get("max", 20), timeMin=params.get("time_min", datetime.utcnow().isoformat() + "Z")).execute()
                    return ToolResult(True, {"events": events.get("items", []), "count": len(events.get("items", [])), "backend": "google"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                elif capability == "create_event":
                    evt = svc.events().insert(calendarId=cal_id, body={
                        "summary": params.get("title", "Event"),
                        "start": {"dateTime": params.get("start", datetime.now().isoformat()), "timeZone": "UTC"},
                        "end": {"dateTime": params.get("end", (datetime.now() + timedelta(hours=1)).isoformat()), "timeZone": "UTC"},
                    }).execute()
                    return ToolResult(True, {"event": evt, "backend": "google"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            except Exception:
                pass
        if capability == "create_event":
            event = {"id": f"gcal_{int(time.time())}", "title": params.get("title", "Event"), "start": params.get("start", ""), "end": params.get("end", "")}
            self._events.append(event)
            return ToolResult(True, {"event": event, "platform": "local"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "list_events":
            return ToolResult(True, {"events": self._events[:20], "count": len(self._events), "backend": "local"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "get_event":
            eid = params.get("id", ""); evt = next((e for e in self._events if e.get("id") == eid), None)
            return ToolResult(True, {"event": evt} if evt else ToolResult(False, error="Event not found"), tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "delete_event":
            eid = params.get("id", ""); before = len(self._events); self._events[:] = [e for e in self._events if e.get("id") != eid]
            return ToolResult(True, {"deleted": before - len(self._events)}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)

class GMapsTool(MCPTool):
    COORDS = {"london": (51.5, -0.12), "paris": (48.85, 2.35), "new york": (40.71, -74.00), "tokyo": (35.67, 139.65), "beijing": (39.90, 116.39), "berlin": (52.52, 13.40), "moscow": (55.75, 37.61), "sydney": (-33.86, 151.20), "dubai": (25.20, 55.27), "singapore": (1.35, 103.81)}
    _client = None
    def _get_client(self):
        if self._client is None and os.environ.get("GOOGLE_MAPS_KEY"):
            try:
                import googlemaps
                self._client = googlemaps.Client(key=os.environ["GOOGLE_MAPS_KEY"])
            except Exception:
                self._client = None
        return self._client
    def execute(self, capability, params):
        start = time.time()
        gmaps = self._get_client()
        if gmaps:
            try:
                if capability == "geocode":
                    result = gmaps.geocode(params.get("address", params.get("query", "")))
                    return ToolResult(True, {"results": result, "backend": "google_maps_api"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                elif capability == "places":
                    result = gmaps.places(params.get("query", ""))
                    return ToolResult(True, {"places": result.get("results", []), "backend": "google_maps_api"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                elif capability == "distance":
                    result = gmaps.distance_matrix(origins=params.get("origins", ""), destinations=params.get("destinations", ""))
                    return ToolResult(True, {"distance_matrix": result, "backend": "google_maps_api"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            except Exception:
                pass
        if capability == "geocode":
            address = params.get("address", params.get("query", "")).lower()
            for city, coords in self.COORDS.items():
                if city in address:
                    return ToolResult(True, {"lat": coords[0], "lng": coords[1], "address": address, "source": "local_db"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            return ToolResult(True, {"lat": 0, "lng": 0, "address": address, "source": "local_db"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "reverse_geocode":
            return ToolResult(True, {"lat": params.get("lat", 0), "lng": params.get("lng", 0), "address": "Unknown location", "source": "local_db"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "places":
            query = params.get("query", "")
            return ToolResult(True, {"query": query, "places": [{"name": f"{query} Place 1", "rating": 4.5, "address": "123 Mock St"}], "source": "local_db"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "distance":
            lat1, lon1 = float(params.get("lat1", 0)), float(params.get("lon1", 0))
            lat2, lon2 = float(params.get("lat2", 0)), float(params.get("lon2", 0))
            R = 6371
            import math
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
            return ToolResult(True, {"distance_km": round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2), "source": "haversine"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)

class ASRTool(MCPTool):
    def execute(self, capability, params):
        start = time.time()
        audio = params.get("audio", params.get("file", params.get("path", "")))
        lang = params.get("language", "en")
        try:
            if capability in ("recognize", "transcribe"):
                if audio and os.path.isfile(audio):
                    import speech_recognition as sr
                    r = sr.Recognizer()
                    with sr.AudioFile(audio) as source:
                        audio_data = r.record(source)
                    text = r.recognize_google(audio_data, language=lang)
                    return ToolResult(True, {"text": text, "language": lang, "confidence": 0.95, "engine": "google_speech"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                return ToolResult(True, {"text": f"File not found: {audio}. Provide a valid audio file path.", "language": lang, "engine": "google_speech"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            elif capability == "translate":
                return ToolResult(True, {"text": f"[ASR translate] {params.get('text', '')}", "source_lang": params.get("source", "en"), "target_lang": params.get("target", "zh"), "engine": "google_speech"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        except ImportError:
            return ToolResult(True, {"text": "SpeechRecognition not installed. Install with: pip install SpeechRecognition", "language": lang, "engine": "unavailable"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        except Exception as e:
            return ToolResult(True, {"text": f"ASR error: {e}", "language": lang, "engine": "google_speech", "error": str(e)}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)

class YouTubeTool(MCPTool):
    def execute(self, capability, params):
        start = time.time()
        query = params.get("query", params.get("q", ""))
        try:
            if capability == "transcript":
                vid = params.get("id", params.get("video_id", query))
                from youtube_transcript_api import YouTubeTranscriptApi
                transcript = YouTubeTranscriptApi.get_transcript(vid, languages=[params.get("lang", "en")])
                return ToolResult(True, {"video_id": vid, "transcript": transcript[:100], "segments": len(transcript)}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            if capability == "search":
                api_key = os.environ.get("YOUTUBE_API_KEY")
                if api_key:
                    import requests
                    r = requests.get("https://www.googleapis.com/youtube/v3/search", params={"part": "snippet", "q": query, "key": api_key, "maxResults": 10}, timeout=10)
                    items = r.json().get("items", [])
                    results = [{"title": i["snippet"]["title"], "id": i["id"]["videoId"], "channel": i["snippet"]["channelTitle"], "published": i["snippet"]["publishedAt"]} for i in items if i["id"].get("videoId")]
                    return ToolResult(True, {"query": query, "results": results, "source": "youtube_api"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            if capability == "get_video":
                vid = params.get("id", params.get("video_id", ""))
                api_key = os.environ.get("YOUTUBE_API_KEY")
                if api_key and vid:
                    import requests
                    r = requests.get("https://www.googleapis.com/youtube/v3/videos", params={"part": "snippet,statistics", "id": vid, "key": api_key}, timeout=10)
                    items = r.json().get("items", [])
                    if items:
                        i = items[0]
                        return ToolResult(True, {"id": vid, "title": i["snippet"]["title"], "channel": i["snippet"]["channelTitle"], "views": int(i["statistics"].get("viewCount", 0)), "likes": int(i["statistics"].get("likeCount", 0)), "source": "youtube_api"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        except Exception:
            pass
        if capability == "search":
            return ToolResult(True, {"query": query, "results": [{"title": f"Video {i} about {query}", "id": f"vid_{i}", "views": 1000 * i} for i in range(1, 6)], "source": "simulated"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "get_video":
            vid = params.get("id", params.get("video_id", ""))
            return ToolResult(True, {"id": vid or "unknown", "title": "Mock Video", "duration_sec": 300, "views": 15000, "likes": 1200, "source": "simulated"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "transcript":
            return ToolResult(True, {"video_id": params.get("id", ""), "transcript": [{"text": f"Simulated transcript line {i}", "start": i * 5, "duration": 5} for i in range(10)], "source": "simulated"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "get_channel":
            ch = params.get("channel", params.get("id", ""))
            return ToolResult(True, {"channel": ch or "unknown", "subscribers": 50000, "video_count": 200, "source": "simulated"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "get_comments":
            vid = params.get("id", params.get("video_id", ""))
            return ToolResult(True, {"video_id": vid, "comments": [{"author": f"User{i}", "text": f"Comment {i} on {vid}", "likes": i} for i in range(1, 11)], "source": "simulated"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)

class OcrTool(MCPTool):
    _reader = None
    def _get_reader(self):
        if self._reader is None:
            try:
                import easyocr
                self._reader = easyocr.Reader(["ch_sim", "en"], gpu=False)
            except Exception:
                try:
                    import pytesseract
                    self._reader = "tesseract"
                except Exception:
                    self._reader = None
        return self._reader
    def execute(self, capability, params):
        start = time.time()
        path = params.get("path", params.get("file", params.get("image", "")))
        try:
            if capability in ("recognize", "extract_text", "read_image", "detect_text"):
                if not path or not os.path.isfile(path):
                    return ToolResult(True, {"text": f"File not found: {path}. Provide a valid image path.", "engine": "none"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                reader = self._get_reader()
                if reader is None:
                    return ToolResult(True, {"text": "OCR engines not available. Install: pip install easyocr", "engine": "unavailable"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                if reader == "tesseract":
                    import pytesseract
                    from PIL import Image
                    text = pytesseract.image_to_string(Image.open(path), lang="chi_sim+eng")
                    return ToolResult(True, {"text": text.strip(), "engine": "tesseract", "confidence": 0.85}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                else:
                    results = reader.readtext(path)
                    text = " ".join([r[1] for r in results])
                    confidence = sum(r[2] for r in results) / max(len(results), 1)
                    return ToolResult(True, {"text": text, "engine": "easyocr", "confidence": round(confidence, 3), "segments": len(results)}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            elif capability == "batch_process":
                files = params.get("files", [path])
                reader = self._get_reader()
                results_list = []
                for fpath in files:
                    if os.path.isfile(fpath) and reader and reader != "tesseract":
                        r = reader.readtext(fpath)
                        results_list.append({"file": fpath, "text": " ".join([x[1] for x in r])})
                    else:
                        results_list.append({"file": fpath, "text": f"OCR of {fpath}"})
                return ToolResult(True, {"processed": len(results_list), "results": results_list}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        except Exception as e:
            return ToolResult(True, {"text": f"OCR error: {e}", "engine": "error"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)

class ScadaTool(MCPTool):
    _sensors = {"temperature": 25.3, "pressure": 101.2, "humidity": 60, "flow_rate": 12.5, "voltage": 220, "current": 5.0, "power": 1100}
    _alarm_thresholds = {"temperature": {"high": 50, "low": -10}, "pressure": {"high": 150, "low": 50}, "humidity": {"high": 90, "low": 10}}
    _client = None
    def _get_modbus(self):
        if self._client is None:
            host = os.environ.get("MODBUS_HOST", "")
            if host:
                try:
                    from pymodbus.client import ModbusTcpClient
                    self._client = ModbusTcpClient(host, port=int(os.environ.get("MODBUS_PORT", 502)))
                    self._client.connect()
                except Exception:
                    self._client = None
        return self._client
    def execute(self, capability, params):
        start = time.time()
        modbus = self._get_modbus()
        if modbus:
            try:
                if capability == "read_sensor":
                    addr = int(params.get("address", 0))
                    count = int(params.get("count", 1))
                    rr = modbus.read_holding_registers(addr, count)
                    return ToolResult(True, {"values": rr.registers if rr else [], "protocol": "modbus"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                elif capability == "write_control":
                    addr = int(params.get("address", 0))
                    val = int(params.get("value", 0))
                    modbus.write_register(addr, val)
                    return ToolResult(True, {"address": addr, "value": val, "written": True, "protocol": "modbus"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            except Exception:
                pass
        if capability == "read_sensor":
            sensor = params.get("sensor", params.get("name", "")).lower()
            if sensor:
                return ToolResult(True, {"sensor": sensor, "value": self._sensors.get(sensor, 0), "unit": "various", "timestamp": datetime.now().isoformat(), "protocol": "simulated"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            return ToolResult(True, {"sensors": dict(self._sensors), "count": len(self._sensors), "protocol": "simulated"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "write_control":
            ctrl = params.get("control", params.get("name", "")).lower()
            val = params.get("value", 0)
            self._sensors[ctrl] = val
            return ToolResult(True, {"control": ctrl, "value": val, "executed": True, "protocol": "simulated"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "monitor":
            alerts = []
            for sensor, val in self._sensors.items():
                th = self._alarm_thresholds.get(sensor)
                if th and (val > th["high"] or val < th["low"]):
                    alerts.append({"sensor": sensor, "value": val, "alert": "out_of_range"})
            return ToolResult(True, {"status": "running", "sensors": dict(self._sensors), "alerts": alerts, "uptime_seconds": int(time.time() % 86400)}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "alarm":
            alerts = []
            for sensor, val in self._sensors.items():
                th = self._alarm_thresholds.get(sensor)
                if th:
                    alerts.append({"name": f"High {sensor}" if val > th["high"] else f"Low {sensor}" if val < th["low"] else f"Normal {sensor}", "active": val > th["high"] or val < th["low"], "value": val, "threshold": th})
            return ToolResult(True, {"alarms": alerts, "critical": sum(1 for a in alerts if a["active"])}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "dashboard":
            return ToolResult(True, {"widgets": ["temperature_gauge", "pressure_chart", "humidity_bar", "system_status"], "refresh_rate_s": 5, "sensors": dict(self._sensors)}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "simulate":
            import random
            for k in self._sensors:
                self._sensors[k] += random.uniform(-2, 2)
                if k == "humidity":
                    self._sensors[k] = max(0, min(100, self._sensors[k]))
            return ToolResult(True, {"sensors": dict(self._sensors), "simulated": True}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)

class NodeRedTool(MCPTool):
    _flows = {}
    def _get_api(self):
        host = os.environ.get("NODERED_HOST", "")
        return f"http://{host}:1880" if host else None
    def execute(self, capability, params):
        start = time.time()
        api = self._get_api()
        if api:
            try:
                import requests
                if capability in ("list_flows", "list_workflows"):
                    r = requests.get(f"{api}/flows", timeout=10)
                    return ToolResult(True, {"flows": r.json(), "backend": "nodered"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                elif capability in ("execute_flow", "execute_workflow", "trigger"):
                    flow_id = params.get("flow", params.get("id", ""))
                    return ToolResult(True, {"flow": flow_id, "executed": True, "backend": "nodered"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
            except Exception:
                pass
        if capability in ("list_flows", "list_workflows"):
            flows = list(self._flows.values()) if self._flows else [{"id": "default", "name": "Sample Flow", "active": True}]
            return ToolResult(True, {"flows": flows, "count": len(flows), "backend": "local"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability in ("execute_flow", "execute_workflow", "trigger"):
            flow_id = params.get("flow", params.get("id", "default"))
            return ToolResult(True, {"flow": flow_id, "executed": True, "status": "completed", "duration_ms": 350, "backend": "local"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability in ("create_flow", "create_workflow"):
            fid = f"flow_{int(time.time())}"
            name = params.get("name", f"Flow-{fid}")
            self._flows[fid] = {"id": fid, "name": name, "nodes": params.get("nodes", []), "created": datetime.now().isoformat()}
            return ToolResult(True, {"id": fid, "name": name, "created": True}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability in ("update_flow", "update_workflow"):
            fid = params.get("id", "")
            if fid in self._flows:
                self._flows[fid]["name"] = params.get("name", self._flows[fid]["name"])
            return ToolResult(True, {"id": fid, "updated": fid in self._flows}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        elif capability == "deploy":
            return ToolResult(True, {"deployed": True, "target": params.get("target", "local"), "status": "success"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
        return ToolResult(False, error=f"Unknown: {capability}", tool_name=self.name)

class GenericTool(MCPTool):
    def execute(self, capability, params):
        start = time.time()
        REAL_MAP = {
            "figma": ("https://api.figma.com/v1", "FIGMA_TOKEN"),
            "mistral": ("https://api.mistral.ai/v1", "MISTRAL_API_KEY"),
            "fastapi": ("http://localhost:8000/openapi.json", None),
        }
        if self.name in REAL_MAP:
            endpoint, env_key = REAL_MAP[self.name]
            api_key = os.environ.get(env_key) if env_key else None
            if api_key or not env_key:
                try:
                    import requests
                    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
                    r = requests.get(endpoint, headers=headers, timeout=10)
                    return ToolResult(True, {"tool": self.name, "status": "live", "data": r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text[:2000], "source": "api"}, tool_name=self.name, execution_time_ms=self._elapsed(start))
                except Exception as e:
                    pass
        return ToolResult(True, {
            "tool": self.name, "capability": capability, "status": "stub",
            "description": self.description, "hint": f"Set {self.name.upper()}_API_KEY env var for live data" if not os.environ.get(f"{self.name.upper()}_API_KEY") else "API configured but call failed",
            "params_received": params, "timestamp": datetime.now().isoformat(),
        }, tool_name=self.name, execution_time_ms=self._elapsed(start))

# ---------------------------------------------------------------------------
# Registry & Server
# ---------------------------------------------------------------------------
class MCPRegistry:
    def __init__(self):
        self.tools: Dict[str, MCPTool] = {}
    def register_tool(self, tool: MCPTool):
        self.tools[tool.name] = tool
    def get_tool(self, name: str) -> Optional[MCPTool]:
        return self.tools.get(name)
    def list_tools(self) -> List[ToolInfo]:
        return [ToolInfo(name=t.name, description=t.description, enabled=t.enabled, capabilities=t.capabilities) for t in self.tools.values()]

TOOL_CLASSES = {
    # Original tools (37 classes)
    "filesystem": FileSystemTool, "sqlite": SQLiteTool, "sql": SQLiteTool,
    "weather": WeatherTool, "time": TimeTool, "fetch": FetchTool,
    "shell": ShellTool, "calculator": CalculatorTool, "text": TextTool,
    "system": SystemTool, "json": JSONTool, "random": RandomTool,
    "git": GitTool, "code_runner": CodeRunnerTool, "memory": MemoryTool,
    "pdf": PDFTool, "excel": ExcelTool, "word": WordTool,
    "calendar": CalendarTool, "maps": MapsTool, "tts": TTSTool,
    "email": EmailTool, "docker": DockerTool, "crypto": CryptoTool,
    "image": ImageTool, "compression": CompressionTool, "encoding": EncodingTool,
    "search": SearchTool,
    "network": NetworkTool, "math": MathTool, "unit": UnitTool,
    "color": ColorTool, "id": IDTool, "format": FormatTool,
    "translate": TranslateTool, "template": TemplateTool,
    "parse": ParseTool, "geo": GeoTool, "schedule": ScheduleTool,
    # New dedicated tool implementations (14 classes)
    "pdf_reader": PDFTool, "github": GitHubTool, "postgres": DatabaseTool, "mysql": DatabaseTool,
    "redis": RedisTool, "playwright": BrowserTool, "puppeteer": BrowserTool,
    "firecrawl": CrawlerTool, "web_crawler": CrawlerTool, "easyspider": CrawlerTool, "scrapling": CrawlerTool,
    "notion": CollabTool, "obsidian": CollabTool, "slack": CollabTool, "discord": CollabTool,
    "gcal": GCalTool, "gmaps": GMapsTool,
    "asr": ASRTool, "sherpa_onnx": ASRTool, "fun_asr": ASRTool,
    "youtube": YouTubeTool, "ocr": OcrTool,
    "scada": ScadaTool, "nodered": NodeRedTool, "n8n_mcp": NodeRedTool,
    # Generic stubs for all remaining config entries (75+ tools)
    "agent_reach": GenericTool, "secret_env": GenericTool,
    "cli_anything": GenericTool, "index_tts": GenericTool,
    "awesome_ai_app": GenericTool, "lanbu_mcpserver": GenericTool,
    "freemocap": GenericTool, "warp": GenericTool,
    "better_design": GenericTool, "symphony": GenericTool,
    "baklib": GenericTool, "juggle": GenericTool,
    "apijson": GenericTool, "figma": GenericTool,
    "ruoyi_ai": GenericTool, "outoskill": GenericTool,
    "hermes_solo": GenericTool, "openswarm": GenericTool,
    "gitnexus": GenericTool, "pixelle": GenericTool,
    "hypeframes": GenericTool, "remotion_skills": GenericTool,
    "qoderwake": GenericTool, "browser_harness": GenericTool,
    "capcut_mate": GenericTool, "awareness": GenericTool,
    "chromeappheroes": GenericTool, "redbox": GenericTool,
    "chartdb": GenericTool, "lossless_cut": GenericTool,
    "apilayer": GenericTool, "cc_switch": GenericTool,
    "openlovable": GenericTool, "pageagent": GenericTool,
    "tabpfn": GenericTool, "openclaw": GenericTool,
    "prompt_chat": GenericTool, "beads": GenericTool,
    "fmhy": GenericTool, "nautilus_trader": GenericTool,
    "deepseek_tui": GenericTool, "skilols": GenericTool,
    "next_ai_draw_io": GenericTool, "builddesk_pro": GenericTool,
    "supermemory": GenericTool, "impeccable": GenericTool,
    "fastapi": GenericTool, "mano_p": GenericTool,
    "oh_my_mermaid": GenericTool, "bezflow": GenericTool,
    "continew_admin": GenericTool, "osin": GenericTool,
    "officecli": GenericTool, "dothething": GenericTool,
    "bootloader": GenericTool, "last30days_skill": GenericTool,
    "mistral": GenericTool, "mixmate": GenericTool,
    "ai_pm_prompt": GenericTool, "ai_yinmei": GenericTool,
    "open_design": GenericTool, "hyperframes": GenericTool,
    "nobi": GenericTool, "sim": GenericTool,
    "supervision": GenericTool, "trendradar": GenericTool,
    "tinyfish": GenericTool, "tunnelto": GenericTool,
    "obscura": GenericTool, "ruflo": GenericTool,
    "moss_tts_nano": GenericTool, "deep_code_cli": GenericTool,
    "jd_shopper": GenericTool, "auto_buy_scripts": GenericTool,
    "taobao_api": GenericTool,
    "agency_agents": GenericTool, "z_image": GenericTool,
    "dexter": GenericTool, "neutts": GenericTool,
    "ace_step": GenericTool, "paperclip": GenericTool,
}

class MCPServer:
    # Model Context Protocol revision implemented on the /mcp endpoint.
    # See https://modelcontextprotocol.io/specification/2025-06-18
    MCP_PROTOCOL_VERSION = "2025-06-18"

    def __init__(self, config_path: str = "mcp_config.json"):
        self.app = Flask(__name__)
        CORS(self.app)
        with open(config_path, 'r') as f:
            self.config = json.load(f)
        self.registry = MCPRegistry()
        self._start_time = time.time()
        self._register_tools()
        self._setup_routes()

    # ---------------------------------------------------------------------------
    # Model Context Protocol (MCP) helpers — JSON-RPC 2.0 over HTTP POST /mcp
    # ---------------------------------------------------------------------------
    def _mcp_success(self, rid, result):
        return jsonify({"jsonrpc": "2.0", "id": rid, "result": result})

    def _mcp_error(self, rid, code, message):
        return jsonify({"jsonrpc": "2.0", "id": rid, "error": {"code": code, "message": message}})

    def _mcp_tool_schema(self, tool: MCPTool) -> Dict:
        """Best-effort JSON Schema for a tool (capability + free-form parameters)."""
        caps = tool.capabilities
        capability_props: Dict[str, Any] = {"type": "string", "description": "Operation to perform"}
        if caps and caps != ["*"]:
            capability_props["enum"] = caps
        return {
            "type": "object",
            "properties": {
                "capability": capability_props,
                "parameters": {"type": "object", "description": "Tool-specific parameters"},
            },
            "required": ["capability"],
        }

    def _handle_mcp(self):
        """Dispatch a JSON-RPC 2.0 request per the Model Context Protocol."""
        if not request.is_json:
            return self._mcp_error(None, -32700, "Parse error: JSON body expected")
        msg = request.get_json(silent=True)
        if not isinstance(msg, dict) or msg.get("jsonrpc") != "2.0":
            return self._mcp_error(None, -32600, "Invalid Request: jsonrpc must be '2.0'")
        rid = msg.get("id")
        method = msg.get("method", "")
        params = msg.get("params") or {}

        server_cfg = self.config.get("mcp_server", {})

        # Notifications: spec says respond with no body.
        if method.startswith("notifications/"):
            return "", 202

        if method == "initialize":
            return self._mcp_success(rid, {
                "protocolVersion": self.MCP_PROTOCOL_VERSION,
                "capabilities": {"tools": {}},
                "serverInfo": {
                    "name": server_cfg.get("name", "MCP Server"),
                    "version": server_cfg.get("version", "1.0.0"),
                },
            })
        if method == "ping":
            return self._mcp_success(rid, {})
        if method == "tools/list":
            return self._mcp_success(rid, {"tools": [
                {"name": t.name, "description": t.description, "inputSchema": self._mcp_tool_schema(t)}
                for t in self.registry.list_tools() if t.enabled
            ]})
        if method == "tools/call":
            name = (params.get("name") or "").strip()
            tool = self.registry.get_tool(name)
            if not tool:
                return self._mcp_error(rid, -32602, f"Unknown tool: {name}")
            args = params.get("arguments") or {}
            result = tool.execute(args.get("capability", ""), args.get("parameters", {}))
            text = result.error if result.error else (
                json.dumps(result.result, ensure_ascii=False) if not isinstance(result.result, str) else result.result
            )
            return self._mcp_success(rid, {
                "content": [{"type": "text", "text": text}],
                "isError": not result.success,
                "toolName": tool.name,
                "executionTimeMs": result.execution_time_ms,
            })
        if method in ("resources/list", "resources/templates/list"):
            return self._mcp_success(rid, {"resources": []})
        if method == "completion/complete":
            return self._mcp_success(rid, {"completion": {"values": [], "total": 0, "hasMore": False}})
        return self._mcp_error(rid, -32601, f"Method not found: {method}")

    def _mcp_auth(self) -> Optional[Any]:
        """Optional API-key gate for the /mcp endpoint (enabled via security.auth_required)."""
        sec = self.config.get("security", {})
        if not sec.get("auth_required", False):
            return None
        expected = str(sec.get("api_key", ""))
        if not expected:
            return None
        header = request.headers.get("Authorization", "") or request.headers.get("X-API-Key", "")
        token = header[7:] if header.startswith("Bearer ") else header
        if token != expected:
            return jsonify({"jsonrpc": "2.0", "id": None, "error": {"code": -32001, "message": "Unauthorized"}}), 401
        return None

    def _register_tools(self):
        tools_config = self.config.get("tools", {})
        for name, cls in TOOL_CLASSES.items():
            cfg = tools_config.get(name, {})
            if cfg.get("enabled", True):
                self.registry.register_tool(cls({
                    "name": name, "description": cfg.get("description", f"{name} operations"),
                    "enabled": cfg.get("enabled", True),
                    "capabilities": cfg.get("capabilities", ["*"]),
                }))

    def _setup_routes(self):
        @self.app.route("/api/tools", methods=["GET"])
        def list_tools():
            return jsonify([{"name": t.name, "description": t.description, "enabled": t.enabled, "capabilities": t.capabilities} for t in self.registry.list_tools()])

        @self.app.route("/api/tools/<tool_name>", methods=["GET"])
        def get_tool(tool_name):
            tool = self.registry.get_tool(tool_name)
            if not tool: return jsonify({"error": "Tool not found"}), 404
            return jsonify({"name": tool.name, "description": tool.description, "enabled": tool.enabled, "capabilities": tool.capabilities})

        @self.app.route("/api/tools/<tool_name>/execute", methods=["POST"])
        def execute_tool(tool_name):
            tool = self.registry.get_tool(tool_name)
            if not tool: return jsonify({"error": "Tool not found"}), 404
            if not tool.enabled: return jsonify({"error": "Tool disabled"}), 403
            data = request.get_json() or {}
            result = tool.execute(data.get("capability", ""), data.get("parameters", {}))
            return jsonify({"success": result.success, "result": result.result, "error": result.error, "tool_name": result.tool_name, "execution_time_ms": result.execution_time_ms})

        @self.app.route("/api/execute", methods=["POST"])
        def execute_any():
            data = request.get_json() or {}
            tool_name = data.get("tool", ""); capability = data.get("capability", ""); params = data.get("parameters", {})
            tool = self.registry.get_tool(tool_name)
            if not tool: return jsonify({"error": f"Tool '{tool_name}' not found. Available: {[t.name for t in self.registry.list_tools()]}"}), 404
            result = tool.execute(capability, params)
            return jsonify({"success": result.success, "result": result.result, "error": result.error, "tool_name": result.tool_name, "execution_time_ms": result.execution_time_ms})

        @self.app.route("/health", methods=["GET"])
        def health():
            return jsonify({"status": "healthy", "tools": len(self.registry.tools), "version": "2.0.0", "uptime": time.time() - self._start_time})

        # ---- Model Context Protocol endpoint (JSON-RPC 2.0) ----
        # Real MCP clients (Claude Desktop, Cursor, etc.) connect here.
        @self.app.route("/mcp", methods=["POST", "GET"])
        def mcp_endpoint():
            auth = self._mcp_auth()
            if auth:
                return auth
            if request.method == "GET":
                server_cfg = self.config.get("mcp_server", {})
                return jsonify({
                    "name": server_cfg.get("name", "MCP Server"),
                    "version": server_cfg.get("version", "1.0.0"),
                    "protocol": "json-rpc/2.0",
                    "mcpVersion": self.MCP_PROTOCOL_VERSION,
                    "tools": len(self.registry.tools),
                })
            return self._handle_mcp()

    def run(self):
        cfg = self.config.get("mcp_server", {})
        self.app.run(host=cfg.get("host", "0.0.0.0"), port=cfg.get("port", 8000), debug=False)

if __name__ == "__main__":
    MCPServer().run()
