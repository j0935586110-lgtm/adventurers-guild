"""Safe, independently testable read-only marketplace search logic."""
import os
import uuid

FIELDS = "id,business_name,title,description,category,city,price_from_twd,created_at"
SAFE_REVIEW_FIELDS = "id,service_id,rating,comment,created_at"
MAX_SCAN = 200


def public_client():
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_PUBLISHABLE_KEY", "").strip()
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY required")
    # Do not accept a legacy JWT here: it might be a service-role key.
    if not key.startswith("sb_publishable_"):
        raise RuntimeError("Only sb_publishable_ keys are allowed")
    from supabase import create_client
    return create_client(url, key)


def search_services(client, *, query="", city="", category="", limit=15):
    if not all(isinstance(x, str) for x in (query, city, category)):
        raise ValueError("Invalid search filters")
    if len(query) > 120 or len(city) > 80 or len(category) > 80:
        raise ValueError("Search filters too long")
    limit = max(1, min(int(limit), 30))
    req = client.table("guild_services").select(FIELDS).eq("status", "published")
    if city.strip():
        req = req.eq("city", city.strip())
    if category.strip():
        req = req.eq("category", category.strip())
    rows = req.order("created_at", desc=True).limit(MAX_SCAN).execute().data or []
    truncated_possible = len(rows) >= MAX_SCAN
    terms = query.lower().split()
    rows = [r for r in rows if all(
        term in " ".join(str(r.get(k) or "") for k in
        ("business_name", "title", "description", "category", "city")).lower()
        for term in terms)]
    return {"services": rows[:limit], "returned": min(len(rows), limit),
            "scan_limit": MAX_SCAN, "truncated_possible": truncated_possible}


def get_service(client, service_id):
    try:
        sid = str(uuid.UUID(str(service_id)))
    except (ValueError, AttributeError, TypeError) as exc:
        raise ValueError("Invalid service UUID") from exc
    rows = client.table("guild_services").select(FIELDS).eq(
        "id", sid).eq("status", "published").limit(1).execute().data or []
    return {"service": rows[0] if rows else None}


def get_service_reviews(client, service_id, limit=15):
    try:
        sid = str(uuid.UUID(str(service_id)))
    except (ValueError, AttributeError, TypeError) as exc:
        raise ValueError("Invalid service UUID") from exc
    size = max(1, min(int(limit), 30))
    rows = client.table("guild_reviews").select(SAFE_REVIEW_FIELDS).eq(
        "service_id", sid).order("created_at", desc=True).limit(size).execute().data or []
    return {"reviews": rows}
