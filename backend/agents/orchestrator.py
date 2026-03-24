import os
import uuid
from datetime import datetime, timezone
from crewai import Crew, Process, LLM
from sqlalchemy.orm import Session

from .analytics_agent import create_analytics_agent, create_analytics_task
from .content_agent import create_content_agent, create_content_task
from .email_agent import create_email_agent, create_email_task
from .social_media_agent import create_social_media_agent, create_social_media_task
from database import AgentLog, Campaign, ReviewRequest, SessionLocal
from review_manager import create_review_event, wait_for_review


def _log_action(
    db: Session,
    campaign_id: str,
    agent_name: str,
    task: str,
    input_text: str,
    output_text: str,
    status: str,
):
    log = AgentLog(
        timestamp=datetime.now(timezone.utc),
        agent_name=agent_name,
        task=task,
        input=input_text,
        output=output_text,
        status=status,
        campaign_id=campaign_id,
    )
    db.add(log)
    db.commit()
    return log


def _emit(broadcast, event: dict):
    event.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
    if broadcast:
        broadcast(event)


def _request_human_review(
    db: Session,
    campaign_id: str,
    agent_name: str,
    task: str,
    output: str,
    broadcast,
) -> str:
    review = ReviewRequest(
        campaign_id=campaign_id,
        agent_name=agent_name,
        task=task,
        output=output,
        status="pending",
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    create_review_event(review.id)

    _emit(broadcast, {
        "type": "review_request",
        "review_id": review.id,
        "campaign_id": campaign_id,
        "agent": agent_name,
        "task": task,
        "output": output[:600],
    })

    decision = wait_for_review(review.id, timeout=600)

    review.status = decision
    review.decided_at = datetime.now(timezone.utc)
    db.commit()

    return decision


def run_campaign(campaign_input: dict, broadcast=None) -> dict:
    campaign_id = str(uuid.uuid4())
    db = SessionLocal()

    try:
        campaign = Campaign(
            campaign_id=campaign_id,
            name=campaign_input.get("name", "Unnamed Campaign"),
            description=campaign_input.get("description", ""),
            target_audience=campaign_input.get("target_audience", ""),
            goals=campaign_input.get("goals", ""),
            status="running",
        )
        db.add(campaign)
        db.commit()

        _emit(broadcast, {
            "type": "campaign_start",
            "campaign_id": campaign_id,
            "name": campaign.name,
        })

        llm = LLM(
            model="claude-sonnet-4-20250514",
            api_key=os.getenv("ANTHROPIC_API_KEY"),
        )
        results = {}

        # ── Analytics Agent ────────────────────────────────────────────────
        _emit(broadcast, {
            "type": "agent_update",
            "agent": "Analytics Agent",
            "status": "running",
            "task": "Market Analysis",
            "campaign_id": campaign_id,
        })
        _log_action(db, campaign_id, "Analytics Agent", "Market Analysis",
                    str(campaign_input), "", "running")
        try:
            analytics_agent = create_analytics_agent(llm)
            analytics_task = create_analytics_task(analytics_agent, campaign_input)
            analytics_crew = Crew(
                agents=[analytics_agent],
                tasks=[analytics_task],
                process=Process.sequential,
                verbose=True,
            )
            analytics_output = str(analytics_crew.kickoff())
            results["analytics"] = analytics_output
            _log_action(db, campaign_id, "Analytics Agent", "Market Analysis",
                        str(campaign_input), analytics_output, "completed")
            _emit(broadcast, {
                "type": "agent_update",
                "agent": "Analytics Agent",
                "status": "completed",
                "task": "Market Analysis",
                "output": analytics_output[:400],
                "campaign_id": campaign_id,
            })
        except Exception as exc:
            analytics_output = f"Analytics failed: {exc}"
            results["analytics"] = analytics_output
            _log_action(db, campaign_id, "Analytics Agent", "Market Analysis",
                        str(campaign_input), analytics_output, "failed")
            _emit(broadcast, {
                "type": "agent_update",
                "agent": "Analytics Agent",
                "status": "error",
                "task": "Market Analysis",
                "output": str(exc),
                "campaign_id": campaign_id,
            })

        # ── Content Agent ──────────────────────────────────────────────────
        _emit(broadcast, {
            "type": "agent_update",
            "agent": "Content Agent",
            "status": "running",
            "task": "Content Strategy",
            "campaign_id": campaign_id,
        })
        _log_action(db, campaign_id, "Content Agent", "Content Strategy",
                    analytics_output, "", "running")
        try:
            content_agent = create_content_agent(llm)
            content_task = create_content_task(content_agent, campaign_input, analytics_output)
            content_crew = Crew(
                agents=[content_agent],
                tasks=[content_task],
                process=Process.sequential,
                verbose=True,
            )
            content_output = str(content_crew.kickoff())
            results["content"] = content_output
            _log_action(db, campaign_id, "Content Agent", "Content Strategy",
                        analytics_output, content_output, "completed")
            _emit(broadcast, {
                "type": "agent_update",
                "agent": "Content Agent",
                "status": "completed",
                "task": "Content Strategy",
                "output": content_output[:400],
                "campaign_id": campaign_id,
            })
        except Exception as exc:
            content_output = f"Content strategy failed: {exc}"
            results["content"] = content_output
            _log_action(db, campaign_id, "Content Agent", "Content Strategy",
                        analytics_output, content_output, "failed")
            _emit(broadcast, {
                "type": "agent_update",
                "agent": "Content Agent",
                "status": "error",
                "task": "Content Strategy",
                "output": str(exc),
                "campaign_id": campaign_id,
            })

        # ── Email Agent (with human review gate) ──────────────────────────
        _emit(broadcast, {
            "type": "agent_update",
            "agent": "Email Agent",
            "status": "running",
            "task": "Email Campaign",
            "campaign_id": campaign_id,
        })
        _log_action(db, campaign_id, "Email Agent", "Email Campaign",
                    content_output, "", "running")
        try:
            email_agent = create_email_agent(llm)
            email_task = create_email_task(email_agent, campaign_input, content_output)
            email_crew = Crew(
                agents=[email_agent],
                tasks=[email_task],
                process=Process.sequential,
                verbose=True,
            )
            email_output = str(email_crew.kickoff())
            results["email"] = email_output

            # Gate: request human review before proceeding
            _emit(broadcast, {
                "type": "agent_update",
                "agent": "Email Agent",
                "status": "review",
                "task": "Email Campaign",
                "output": email_output[:400],
                "campaign_id": campaign_id,
            })
            _log_action(db, campaign_id, "Email Agent", "Email Campaign",
                        content_output, email_output, "review")

            decision = _request_human_review(
                db, campaign_id, "Email Agent", "Email Campaign", email_output, broadcast
            )

            final_email_status = "completed" if decision == "approved" else "rejected"
            _log_action(db, campaign_id, "Email Agent", "Email Campaign",
                        content_output, email_output, final_email_status)
            _emit(broadcast, {
                "type": "agent_update",
                "agent": "Email Agent",
                "status": final_email_status,
                "task": "Email Campaign",
                "output": email_output[:400],
                "campaign_id": campaign_id,
            })
        except Exception as exc:
            email_output = f"Email campaign failed: {exc}"
            results["email"] = email_output
            _log_action(db, campaign_id, "Email Agent", "Email Campaign",
                        content_output, email_output, "failed")
            _emit(broadcast, {
                "type": "agent_update",
                "agent": "Email Agent",
                "status": "error",
                "task": "Email Campaign",
                "output": str(exc),
                "campaign_id": campaign_id,
            })

        # ── Social Media Agent ─────────────────────────────────────────────
        _emit(broadcast, {
            "type": "agent_update",
            "agent": "Social Media Agent",
            "status": "running",
            "task": "Social Media Strategy",
            "campaign_id": campaign_id,
        })
        _log_action(db, campaign_id, "Social Media Agent", "Social Media Strategy",
                    content_output, "", "running")
        try:
            social_agent = create_social_media_agent(llm)
            social_task = create_social_media_task(social_agent, campaign_input, content_output)
            social_crew = Crew(
                agents=[social_agent],
                tasks=[social_task],
                process=Process.sequential,
                verbose=True,
            )
            social_output = str(social_crew.kickoff())
            results["social_media"] = social_output
            _log_action(db, campaign_id, "Social Media Agent", "Social Media Strategy",
                        content_output, social_output, "completed")
            _emit(broadcast, {
                "type": "agent_update",
                "agent": "Social Media Agent",
                "status": "completed",
                "task": "Social Media Strategy",
                "output": social_output[:400],
                "campaign_id": campaign_id,
            })
        except Exception as exc:
            social_output = f"Social media strategy failed: {exc}"
            results["social_media"] = social_output
            _log_action(db, campaign_id, "Social Media Agent", "Social Media Strategy",
                        content_output, social_output, "failed")
            _emit(broadcast, {
                "type": "agent_update",
                "agent": "Social Media Agent",
                "status": "error",
                "task": "Social Media Strategy",
                "output": str(exc),
                "campaign_id": campaign_id,
            })

        campaign.status = "completed"
        campaign.completed_at = datetime.now(timezone.utc)
        db.commit()

        _emit(broadcast, {
            "type": "campaign_complete",
            "campaign_id": campaign_id,
            "status": "completed",
        })

        return {"campaign_id": campaign_id, "status": "completed", "results": results}

    except Exception as exc:
        campaign.status = "failed"
        db.commit()
        _emit(broadcast, {
            "type": "campaign_error",
            "campaign_id": campaign_id,
            "error": str(exc),
        })
        raise exc
    finally:
        db.close()
