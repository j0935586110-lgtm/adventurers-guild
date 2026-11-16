"""Unit tests for public, read-only marketplace discovery."""
import importlib.util
import pathlib
import sys

import pytest

MCP_DIR = pathlib.Path(__file__).parents[1] / "mcp"
spec = importlib.util.spec_from_file_location("marketplace_core", MCP_DIR / "marketplace_core.py")
market = importlib.util.module_from_spec(spec)
spec.loader.exec_module(market)


class Table:
    def __init__(self, rows):
        self.rows = list(rows)
    def select(self, _fields):
        return self
    def eq(self, key, value):
        self.rows = [r for r in self.rows if r.get(key) == value]
        return self
    def order(self, key, desc=False):
        self.rows.sort(key=lambda r: r.get(key) or "", reverse=desc)
        return self
    def limit(self, size):
        self.rows = self.rows[:size]
        return self
    def in_(self, key, values):
        self.rows = [r for r in self.rows if r.get(key) in values]
        return self
    def execute(self):
        class Result:
            pass
        out = Result()
        out.data = self.rows
        return out


class Client:
    def __init__(self, tables):
        self.tables = tables
        self.calls = []
    def table(self, name):
        self.calls.append(name)
        return Table(self.tables.get(name, []))


SVC = "f5a8e8ee-1d27-4a18-9aba-5fdc09d50a1a"


def test_search_returns_only_published_and_matches_chinese():
    cli = Client({"guild_services": [
        {"id":"a","title":"新北印刷服務","business_name":"甲印刷", "description":"海報","category":"印刷","city":"新北市","status":"published","created_at":"2026-10-28"},
        {"id":"b","title":"台北修車","business_name":"乙商家", "description":"修車","category":"維修","city":"台北市","status":"published","created_at":"2026-10-28"},
        {"id":"c","title":"新北印刷內部","business_name":"丙商家", "description":"秘密","category":"印刷","city":"新北市","status":"draft","created_at":"2026-10-28"}]})
    got = market.search_services(cli, query="新北 印刷", city="新北市")
    assert [s["id"] for s in got["services"]] == ["a"]
    assert got["returned"] == 1


def test_invalid_input_rejected_before_query():
    cli = Client({})
    with pytest.raises(ValueError):
        market.search_services(cli, query="x" * 121)
    with pytest.raises(ValueError):
        market.get_service(cli, "not-uuid")
    assert not cli.calls


def test_get_service_filters_by_published_status():
    cli = Client({"guild_services":[{"id":SVC, "status":"draft"}]})
    assert market.get_service(cli,SVC)["service"] is None


def test_public_agent_never_exports_mutating_tools():
    src = (MCP_DIR / "marketplace_public.py").read_text()
    for name in ("search_services", "get_service", "get_service_reviews"):
        assert 'name="' + name + '"' in src
    for name in ("publish_service", "delete_service", "release_payment"):
        assert 'name="' + name + '"' not in src
    assert "SUPABASE_SERVICE_KEY" not in src


def test_creds_are_required_and_service_key_forbidden(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_PUBLISHABLE_KEY", raising=False)
    with pytest.raises(RuntimeError):
        market.public_client()
    monkeypatch.setenv("SUPABASE_URL","https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY","sb_secret_example")
    with pytest.raises(RuntimeError):
        market.public_client()


def test_truncated_scan_flag_survives_keyword_filtering():
    client = Client({"guild_services":[
        {"id": str(i), "title": "一般商品", "business_name":"商家",
         "description":"無", "category":"服務", "city":"台北市",
         "status":"published", "created_at":f"2026-10-28T00:00:{i%60:02d}"}
        for i in range(200)
    ]})
    result = market.search_services(client, query="沒有的字")
    assert result["services"] == []
    assert result["truncated_possible"] is True
