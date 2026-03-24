import os
import uuid
from datetime import datetime, timezone
from crewai import Crew, Process, LLM
from sqlalchemy.orm import Session

from .analytics_agent import create_analytics_agent, create_analytics_task
from .content_agent import create_content_agent, create_content_task
from .email_agent import create_email_agent, create_email_task
from .social_media_agent import create_social_media_agent, create_social_media_task
from database import AgentLog, Campaign, SessionLocal


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


def run_campaign(campaign_input: dict) -> dict:
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

        api_key = os.getenv("ANTHROPIC_API_KEY")
        llm = LLM(
            model="claude-sonnet-4-5",
            api_key=api_key,
        )

        results = {}

        # --- Analytics Agent ---
        _log_action(
            db, campaign_id, "Analytics Agent", "Market Analysis",
            str(campaign_input), "", "running"
        )
        try:
            analytics_agent = create_analytics_agent(llm)
            analytics_task = create_analytics_task(analytics_agent, campaign_input)
            analytics_crew = Crew(
                agents=[analytics_agent],
                tasks=[analytics_task],
                process=Process.sequential,
                verbose=True,
            )
            analytics_result = analytics_crew.kickoff()
            analytics_output = str(analytics_result)
            results["analytics"] = analytics_output
            _log_action(
                db, campaign_id, "Analytics Agent", "Market Analysis",
                str(campaign_input), analytics_output, "completed"
            )
        except Exception as e:
            analytics_output = f"Analytics failed: {str(e)}"
            results["analytics"] = analytics_output
            _log_action(
                db, campaign_id, "Analytics Agent", "Market Analysis",
                str(campaign_input), analytics_output, "failed"
            )

        # --- Content Agent ---
        _log_action(
            db, campaign_id, "Content Agent", "Content Strategy",
            analytics_output, "", "running"
        )
        try:
            content_agent = create_content_agent(llm)
            content_task = create_content_task(content_agent, campaign_input, analytics_output)
            content_crew = Crew(
                agents=[content_agent],
                tasks=[content_task],
                process=Process.sequential,
                verbose=True,
            )
            content_result = content_crew.kickoff()
            content_output = str(content_result)
            results["content"] = content_output
            _log_action(
                db, campaign_id, "Content Agent", "Content Strategy",
                analytics_output, content_output, "completed"
            )
        except Exception as e:
            content_output = f"Content strategy failed: {str(e)}"
            results["content"] = content_output
            _log_action(
                db, campaign_id, "Content Agent", "Content Strategy",
                analytics_output, content_output, "failed"
            )

        # --- Email Agent ---
        _log_action(
            db, campaign_id, "Email Agent", "Email Campaign",
            content_output, "", "running"
        )
        try:
            email_agent = create_email_agent(llm)
            email_task = create_email_task(email_agent, campaign_input, content_output)
            email_crew = Crew(
                agents=[email_agent],
                tasks=[email_task],
                process=Process.sequential,
                verbose=True,
            )
            email_result = email_crew.kickoff()
            email_output = str(email_result)
            results["email"] = email_output
            _log_action(
                db, campaign_id, "Email Agent", "Email Campaign",
                content_output, email_output, "completed"
            )
        except Exception as e:
            email_output = f"Email campaign failed: {str(e)}"
            results["email"] = email_output
            _log_action(
                db, campaign_id, "Email Agent", "Email Campaign",
                content_output, email_output, "failed"
            )

        # --- Social Media Agent ---
        _log_action(
            db, campaign_id, "Social Media Agent", "Social Media Strategy",
            content_output, "", "running"
        )
        try:
            social_agent = create_social_media_agent(llm)
            social_task = create_social_media_task(social_agent, campaign_input, content_output)
            social_crew = Crew(
                agents=[social_agent],
                tasks=[social_task],
                process=Process.sequential,
                verbose=True,
            )
            social_result = social_crew.kickoff()
            social_output = str(social_result)
            results["social_media"] = social_output
            _log_action(
                db, campaign_id, "Social Media Agent", "Social Media Strategy",
                content_output, social_output, "completed"
            )
        except Exception as e:
            social_output = f"Social media strategy failed: {str(e)}"
            results["social_media"] = social_output
            _log_action(
                db, campaign_id, "Social Media Agent", "Social Media Strategy",
                content_output, social_output, "failed"
            )

        campaign.status = "completed"
        campaign.completed_at = datetime.now(timezone.utc)
        db.commit()

        return {
            "campaign_id": campaign_id,
            "status": "completed",
            "results": results,
        }

    except Exception as e:
        campaign.status = "failed"
        db.commit()
        raise e
    finally:
        db.close()
