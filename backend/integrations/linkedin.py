"""
LinkedIn UGC Post API integration.

Required credentials (set via the Settings panel):
  access_token  – OAuth 2.0 token with w_member_social scope
  author_urn    – e.g. "urn:li:person:abc123" (personal) or
                      "urn:li:organization:456" (company page)

Posts a plain-text share visible to all LinkedIn members.
Character limit: 3 000 chars.
"""

import requests

LI_API = "https://api.linkedin.com/v2/ugcPosts"


def post_to_linkedin(content: str, credentials: dict) -> dict:
    access_token = credentials.get("access_token", "").strip()
    author_urn   = credentials.get("author_urn", "").strip()

    if not access_token or not author_urn:
        return {
            "success": False,
            "platform": "linkedin",
            "error": "Missing access_token or author_urn",
        }

    text = content[:3000]

    body = {
        "author": author_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": text},
                "shareMediaCategory": "NONE",
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        },
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
    }

    try:
        r = requests.post(LI_API, json=body, headers=headers, timeout=30)
        r.raise_for_status()
        post_id = r.headers.get("x-restli-id") or r.json().get("id", "")
    except requests.RequestException as exc:
        detail = ""
        try:
            detail = exc.response.json() if exc.response is not None else {}
        except Exception:
            pass
        return {
            "success": False,
            "platform": "linkedin",
            "error": f"LinkedIn API error: {exc} {detail}",
        }

    return {
        "success": True,
        "platform": "linkedin",
        "post_id": post_id,
        "url": f"https://www.linkedin.com/feed/update/{post_id}/",
    }
