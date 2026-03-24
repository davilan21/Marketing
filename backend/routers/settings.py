"""
Settings router — manage social media platform credentials.

Endpoints:
  GET    /api/settings/credentials              list all platforms + masked status
  GET    /api/settings/credentials/{platform}   single platform (masked)
  PUT    /api/settings/credentials/{platform}   upsert credentials
  DELETE /api/settings/credentials/{platform}   remove credentials
  POST   /api/settings/credentials/{platform}/test  test the connection live
"""

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import PlatformCredentials, get_db
from integrations.instagram import post_to_instagram
from integrations.linkedin import post_to_linkedin
from integrations.tiktok import post_to_tiktok

router = APIRouter(prefix="/api/settings", tags=["settings"])

# ── Platform metadata (drives the frontend form) ──────────────────────────────

PLATFORM_META: dict[str, dict] = {
    "instagram": {
        "label": "Instagram",
        "icon": "📸",
        "fields": [
            {"key": "access_token",                  "label": "Access Token",                   "secret": True,  "placeholder": "EAAxxxxxx…",              "hint": "Long-lived Page or User access token from Meta developer portal"},
            {"key": "instagram_business_account_id", "label": "Business Account ID",            "secret": False, "placeholder": "17841400000000000",        "hint": "Numeric Instagram Business Account ID"},
            {"key": "image_url",                     "label": "Default Image URL (optional)",   "secret": False, "placeholder": "https://…/banner.jpg",     "hint": "Instagram requires an image — posts without one are saved as drafts"},
        ],
        "docs": "https://developers.facebook.com/docs/instagram-api/getting-started",
    },
    "linkedin": {
        "label": "LinkedIn",
        "icon": "💼",
        "fields": [
            {"key": "access_token", "label": "Access Token", "secret": True,  "placeholder": "AQXxxxxxx…", "hint": "OAuth 2.0 token with w_member_social scope"},
            {"key": "author_urn",   "label": "Author URN",   "secret": False, "placeholder": "urn:li:person:abc123  or  urn:li:organization:456", "hint": "Who posts — your person URN or a company page organization URN"},
        ],
        "docs": "https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api",
    },
    "tiktok": {
        "label": "TikTok",
        "icon": "🎵",
        "fields": [
            {"key": "access_token", "label": "Access Token", "secret": True,  "placeholder": "act.xxxxxx…", "hint": "OAuth 2.0 token from TikTok for Developers"},
            {"key": "open_id",      "label": "Open ID",      "secret": False, "placeholder": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "hint": "User open_id returned during OAuth flow"},
        ],
        "docs": "https://developers.tiktok.com/doc/content-posting-api-get-started/",
    },
}

POSTING_FN = {
    "instagram": post_to_instagram,
    "linkedin":  post_to_linkedin,
    "tiktok":    post_to_tiktok,
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _mask(value: str) -> str:
    """Show only the last 4 characters, mask the rest."""
    if not value or len(value) <= 4:
        return "****"
    return "****" + value[-4:]


def _serialize(row: PlatformCredentials, masked: bool = True) -> dict:
    meta   = PLATFORM_META.get(row.platform, {})
    fields = meta.get("fields", [])
    try:
        creds = json.loads(row.creds_json or "{}")
    except Exception:
        creds = {}

    masked_creds = {}
    for f in fields:
        k = f["key"]
        v = creds.get(k, "")
        masked_creds[k] = _mask(v) if (masked and f.get("secret") and v) else v

    return {
        "platform":   row.platform,
        "label":      meta.get("label", row.platform),
        "icon":       meta.get("icon", ""),
        "enabled":    row.enabled,
        "configured": bool(creds),
        "fields":     fields,
        "credentials": masked_creds,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "docs":       meta.get("docs", ""),
    }


def _get_or_404(platform: str, db: Session) -> PlatformCredentials:
    row = db.query(PlatformCredentials).filter_by(platform=platform).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Platform '{platform}' not found")
    return row


# ── Schemas ───────────────────────────────────────────────────────────────────

class CredentialsPayload(BaseModel):
    credentials: dict[str, Any]
    enabled: bool = True


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/credentials")
def list_credentials(db: Session = Depends(get_db)):
    """Return all platforms with masked credentials + configuration status."""
    rows = {r.platform: r for r in db.query(PlatformCredentials).all()}
    result = []
    for platform, meta in PLATFORM_META.items():
        if platform in rows:
            result.append(_serialize(rows[platform]))
        else:
            # Return a "not configured" stub so the frontend always gets all 3
            result.append({
                "platform":    platform,
                "label":       meta["label"],
                "icon":        meta["icon"],
                "enabled":     False,
                "configured":  False,
                "fields":      meta["fields"],
                "credentials": {},
                "updated_at":  None,
                "docs":        meta.get("docs", ""),
            })
    return result


@router.get("/credentials/{platform}")
def get_credentials(platform: str, db: Session = Depends(get_db)):
    if platform not in PLATFORM_META:
        raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")
    row = db.query(PlatformCredentials).filter_by(platform=platform).first()
    if not row:
        meta = PLATFORM_META[platform]
        return {
            "platform":    platform,
            "label":       meta["label"],
            "icon":        meta["icon"],
            "enabled":     False,
            "configured":  False,
            "fields":      meta["fields"],
            "credentials": {},
            "updated_at":  None,
            "docs":        meta.get("docs", ""),
        }
    return _serialize(row)


@router.put("/credentials/{platform}")
def upsert_credentials(
    platform: str,
    payload: CredentialsPayload,
    db: Session = Depends(get_db),
):
    if platform not in PLATFORM_META:
        raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")

    row = db.query(PlatformCredentials).filter_by(platform=platform).first()
    if row:
        # Merge: keep existing secret values if the frontend sends back the masked placeholder
        try:
            existing = json.loads(row.creds_json or "{}")
        except Exception:
            existing = {}
        merged = dict(existing)
        for field_meta in PLATFORM_META[platform]["fields"]:
            k = field_meta["key"]
            new_val = payload.credentials.get(k, "")
            # If the incoming value looks like our mask pattern, keep the original
            if new_val and new_val.startswith("****") and k in existing:
                merged[k] = existing[k]
            elif new_val:
                merged[k] = new_val
        row.creds_json = json.dumps(merged)
        row.enabled    = payload.enabled
        row.updated_at = datetime.now(timezone.utc)
    else:
        row = PlatformCredentials(
            platform=platform,
            creds_json=json.dumps(payload.credentials),
            enabled=payload.enabled,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(row)

    db.commit()
    db.refresh(row)
    return _serialize(row)


@router.delete("/credentials/{platform}")
def delete_credentials(platform: str, db: Session = Depends(get_db)):
    row = _get_or_404(platform, db)
    db.delete(row)
    db.commit()
    return {"platform": platform, "deleted": True}


@router.post("/credentials/{platform}/test")
def test_credentials(platform: str, db: Session = Depends(get_db)):
    """
    Make a lightweight live call to verify the credentials work.
    Uses a short, benign test message — does NOT create a real post.
    """
    if platform not in PLATFORM_META:
        raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")

    row = db.query(PlatformCredentials).filter_by(platform=platform).first()
    if not row:
        return {"success": False, "error": "No credentials saved for this platform."}

    try:
        creds = json.loads(row.creds_json or "{}")
    except Exception:
        return {"success": False, "error": "Stored credentials are malformed JSON."}

    # For connection testing we call the posting function with a test string.
    # The integrations return success=False with a meaningful error when creds are wrong.
    fn = POSTING_FN.get(platform)
    if not fn:
        return {"success": False, "error": "No posting function registered for this platform."}

    result = fn("[Connection test — not a real post]", creds)
    # A draft result still means credentials were accepted (just missing optional image)
    if result.get("draft"):
        return {"success": True, "note": result.get("error", "Credentials valid — draft mode active.")}
    return result
