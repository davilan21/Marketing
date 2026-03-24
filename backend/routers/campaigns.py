from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from typing import Optional
import threading

from database import get_db, AgentLog, Campaign
from agents.orchestrator import run_campaign

router = APIRouter(prefix="/api", tags=["campaigns"])

# Track background campaign runs
_campaign_futures: dict = {}


class CampaignRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    target_audience: str
    goals: str


class CampaignResponse(BaseModel):
    campaign_id: str
    status: str
    message: str


@router.post("/campaigns", response_model=CampaignResponse)
def create_campaign(request: CampaignRequest, background_tasks: BackgroundTasks):
    """Launch a new marketing campaign with all 4 agents."""
    import uuid
    campaign_id = str(uuid.uuid4())

    campaign_input = {
        "name": request.name,
        "description": request.description,
        "target_audience": request.target_audience,
        "goals": request.goals,
    }

    def run_in_background():
        try:
            run_campaign(campaign_input)
        except Exception as e:
            print(f"Campaign {campaign_id} failed: {e}")

    background_tasks.add_task(run_in_background)

    return CampaignResponse(
        campaign_id=campaign_id,
        status="started",
        message="Campaign launched. Agents are working in sequence.",
    )


@router.post("/campaigns/run", response_model=dict)
def run_campaign_sync(request: CampaignRequest):
    """Run campaign synchronously and return full results."""
    campaign_input = {
        "name": request.name,
        "description": request.description,
        "target_audience": request.target_audience,
        "goals": request.goals,
    }
    result = run_campaign(campaign_input)
    return result


@router.get("/campaigns")
def list_campaigns(db: Session = Depends(get_db)):
    """List all campaigns."""
    campaigns = db.query(Campaign).order_by(desc(Campaign.created_at)).all()
    return [
        {
            "id": c.id,
            "campaign_id": c.campaign_id,
            "name": c.name,
            "description": c.description,
            "target_audience": c.target_audience,
            "goals": c.goals,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "completed_at": c.completed_at.isoformat() if c.completed_at else None,
        }
        for c in campaigns
    ]


@router.get("/campaigns/{campaign_id}")
def get_campaign(campaign_id: str, db: Session = Depends(get_db)):
    """Get campaign details and all agent logs for it."""
    campaign = db.query(Campaign).filter(Campaign.campaign_id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    logs = (
        db.query(AgentLog)
        .filter(AgentLog.campaign_id == campaign_id)
        .order_by(AgentLog.timestamp)
        .all()
    )

    return {
        "campaign": {
            "id": campaign.id,
            "campaign_id": campaign.campaign_id,
            "name": campaign.name,
            "description": campaign.description,
            "target_audience": campaign.target_audience,
            "goals": campaign.goals,
            "status": campaign.status,
            "created_at": campaign.created_at.isoformat() if campaign.created_at else None,
            "completed_at": campaign.completed_at.isoformat() if campaign.completed_at else None,
        },
        "logs": [
            {
                "id": log.id,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "agent_name": log.agent_name,
                "task": log.task,
                "input": log.input,
                "output": log.output,
                "status": log.status,
            }
            for log in logs
        ],
    }


@router.get("/logs")
def get_all_logs(
    limit: int = 100,
    agent_name: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Retrieve agent action logs with optional filters."""
    query = db.query(AgentLog).order_by(desc(AgentLog.timestamp))
    if agent_name:
        query = query.filter(AgentLog.agent_name == agent_name)
    if status:
        query = query.filter(AgentLog.status == status)
    logs = query.limit(limit).all()
    return [
        {
            "id": log.id,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "agent_name": log.agent_name,
            "task": log.task,
            "input": log.input,
            "output": log.output,
            "status": log.status,
            "campaign_id": log.campaign_id,
        }
        for log in logs
    ]


@router.get("/logs/stats")
def get_log_stats(db: Session = Depends(get_db)):
    """Get summary statistics for agent logs."""
    from sqlalchemy import func

    total = db.query(func.count(AgentLog.id)).scalar()
    by_agent = (
        db.query(AgentLog.agent_name, func.count(AgentLog.id))
        .group_by(AgentLog.agent_name)
        .all()
    )
    by_status = (
        db.query(AgentLog.status, func.count(AgentLog.id))
        .group_by(AgentLog.status)
        .all()
    )
    total_campaigns = db.query(func.count(Campaign.id)).scalar()

    return {
        "total_logs": total,
        "total_campaigns": total_campaigns,
        "by_agent": {row[0]: row[1] for row in by_agent},
        "by_status": {row[0]: row[1] for row in by_status},
    }
