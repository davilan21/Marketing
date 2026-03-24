"""
Instagram Graph API integration.

Required credentials (set via the Settings panel):
  access_token                 – Long-lived Page or User access token
  instagram_business_account_id – The IG Business Account ID (numeric string)

Posting flow:
  1. POST /{ig_user_id}/media          → creates a media container (returns creation_id)
  2. POST /{ig_user_id}/media_publish  → publishes the container

Instagram does NOT support plain-text-only posts; a caption is attached to an image.
If no image_url is provided in the credentials the post is saved as a draft in our
own DB (status="draft") and the user can publish it manually once they add an image.
"""

import requests

GRAPH_BASE = "https://graph.facebook.com/v19.0"


def post_to_instagram(content: str, credentials: dict) -> dict:
    access_token = credentials.get("access_token", "").strip()
    ig_user_id   = credentials.get("instagram_business_account_id", "").strip()
    image_url    = credentials.get("image_url", "").strip()   # optional default image

    if not access_token or not ig_user_id:
        return {
            "success": False,
            "platform": "instagram",
            "error": "Missing access_token or instagram_business_account_id",
        }

    # Truncate caption to Instagram's 2200-char limit
    caption = content[:2200]

    # ── Step 1: create media container ──────────────────────────────────────
    media_payload: dict = {
        "caption": caption,
        "access_token": access_token,
    }
    if image_url:
        media_payload["image_url"] = image_url
        media_payload["media_type"] = "IMAGE"
    else:
        # No image → save draft, skip publishing
        return {
            "success": False,
            "platform": "instagram",
            "draft": True,
            "content": caption,
            "error": (
                "No image_url configured. Instagram requires an image for posts. "
                "Add a default image_url in Settings to enable auto-posting, "
                "or publish manually from the Approval Log."
            ),
        }

    try:
        r = requests.post(
            f"{GRAPH_BASE}/{ig_user_id}/media",
            data=media_payload,
            timeout=30,
        )
        r.raise_for_status()
        creation_id = r.json().get("id")
    except requests.RequestException as exc:
        return {
            "success": False,
            "platform": "instagram",
            "error": f"Media container creation failed: {exc}",
        }

    # ── Step 2: publish ──────────────────────────────────────────────────────
    try:
        r2 = requests.post(
            f"{GRAPH_BASE}/{ig_user_id}/media_publish",
            data={"creation_id": creation_id, "access_token": access_token},
            timeout=30,
        )
        r2.raise_for_status()
        media_id = r2.json().get("id")
    except requests.RequestException as exc:
        return {
            "success": False,
            "platform": "instagram",
            "error": f"Media publish failed: {exc}",
        }

    return {
        "success": True,
        "platform": "instagram",
        "post_id": media_id,
        "url": f"https://www.instagram.com/p/{media_id}/",
    }
