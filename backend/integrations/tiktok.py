"""
TikTok Content Posting API integration.

Required credentials (set via the Settings panel):
  access_token  – OAuth 2.0 user token (from TikTok for Developers)
  open_id       – The user's open_id returned during OAuth

TikTok's Content Posting API is primarily video-based.  For text-only campaigns
we use the "Direct Post" endpoint to create a text post (available on TikTok
Creator Marketplace accounts) or fall back to saving the content as a draft in
our DB so the user can copy-paste into TikTok manually.

Text post endpoint (requires TikTok for Business / Creator account with permission):
  POST https://open.tiktokapis.com/v2/post/publish/text/apply/

If the account does not have text-post permission the API returns a specific error
and we fall back gracefully.
"""

import requests

TIKTOK_TEXT_POST = "https://open.tiktokapis.com/v2/post/publish/text/apply/"


def post_to_tiktok(content: str, credentials: dict) -> dict:
    access_token = credentials.get("access_token", "").strip()
    open_id      = credentials.get("open_id", "").strip()

    if not access_token or not open_id:
        return {
            "success": False,
            "platform": "tiktok",
            "error": "Missing access_token or open_id",
        }

    # TikTok text posts cap at 2 200 chars
    text = content[:2200]

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=UTF-8",
    }

    body = {
        "post_info": {
            "title": text,
            "privacy_level": "PUBLIC_TO_EVERYONE",
            "disable_duet": False,
            "disable_comment": False,
            "disable_stitch": False,
        },
        "source_info": {
            "source": "TEXT",
        },
        "open_id": open_id,
    }

    try:
        r = requests.post(TIKTOK_TEXT_POST, json=body, headers=headers, timeout=30)
        r.raise_for_status()
        data = r.json().get("data", {})
        publish_id = data.get("publish_id", "")
    except requests.HTTPError as exc:
        # Graceful fallback for accounts without text-post permission
        try:
            err_data = exc.response.json()
            err_code = err_data.get("error", {}).get("code", "")
        except Exception:
            err_code = ""

        if err_code in ("permission_denied", "access_token_invalid"):
            return {
                "success": False,
                "platform": "tiktok",
                "draft": True,
                "content": text,
                "error": (
                    f"TikTok API error ({err_code}). "
                    "Text posts require a TikTok for Business account with "
                    "Content Posting API access. Content saved as draft — "
                    "copy it from the Approval Log to post manually."
                ),
            }
        return {
            "success": False,
            "platform": "tiktok",
            "error": f"TikTok API error: {exc}",
        }
    except requests.RequestException as exc:
        return {
            "success": False,
            "platform": "tiktok",
            "error": f"TikTok request failed: {exc}",
        }

    return {
        "success": True,
        "platform": "tiktok",
        "publish_id": publish_id,
        "note": "Post submitted. Check TikTok app — it may appear after processing.",
    }
