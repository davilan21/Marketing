from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from database import get_db, AgentLog, Campaign, ReviewRequest, ApprovalLog
from agents.orchestrator import run_campaign
from review_manager import submit_decision
from ws_manager import manager

router = APIRouter(prefix="/api", tags=["campaigns"])


class CampaignRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    target_audience: str
    goals: str


# ── Campaign endpoints ─────────────────────────────────────────────────────────

@router.post("/run")
def run_campaign_endpoint(request: CampaignRequest, background_tasks: BackgroundTasks):
    """
    Start a campaign asynchronously. Live progress is streamed over WebSocket /ws.
    All 4 agents run in sequence; the Email Agent pauses for human review.
    """
    campaign_input = {
        "name": request.name,
        "description": request.description,
        "target_audience": request.target_audience,
        "goals": request.goals,
    }

    def _run():
        run_campaign(campaign_input, broadcast=manager.broadcast_sync)

    background_tasks.add_task(_run)
    return {"status": "started", "message": "Campaign launched. Subscribe to /ws for live updates."}


@router.post("/campaigns/run")
def run_campaign_sync(request: CampaignRequest):
    """Run campaign synchronously (no WebSocket needed) and return all results."""
    campaign_input = {
        "name": request.name,
        "description": request.description,
        "target_audience": request.target_audience,
        "goals": request.goals,
    }
    return run_campaign(campaign_input, broadcast=manager.broadcast_sync)


@router.post("/campaigns")
def create_campaign(request: CampaignRequest, background_tasks: BackgroundTasks):
    """Alias of /run – kept for backwards compatibility."""
    return run_campaign_endpoint(request, background_tasks)


@router.get("/campaigns")
def list_campaigns(db: Session = Depends(get_db)):
    campaigns = db.query(Campaign).order_by(desc(Campaign.created_at)).all()
    return [
        {
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
            "campaign_id": campaign.campaign_id,
            "name": campaign.name,
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


# ── Log endpoints ──────────────────────────────────────────────────────────────

@router.get("/logs")
def get_all_logs(
    limit: int = 100,
    agent_name: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
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
    total = db.query(func.count(AgentLog.id)).scalar()
    by_agent = db.query(AgentLog.agent_name, func.count(AgentLog.id)).group_by(AgentLog.agent_name).all()
    by_status = db.query(AgentLog.status, func.count(AgentLog.id)).group_by(AgentLog.status).all()
    total_campaigns = db.query(func.count(Campaign.id)).scalar()
    return {
        "total_logs": total,
        "total_campaigns": total_campaigns,
        "by_agent": {row[0]: row[1] for row in by_agent},
        "by_status": {row[0]: row[1] for row in by_status},
    }


# ── Human-approval endpoints ───────────────────────────────────────────────────

@router.get("/review")
def get_pending_approvals(db: Session = Depends(get_db)):
    """Return all approval requests that are still awaiting a decision."""
    reviews = (
        db.query(ReviewRequest)
        .filter(ReviewRequest.status == "pending_approval")
        .order_by(desc(ReviewRequest.created_at))
        .all()
    )
    return [
        {
            "id": r.id,
            "campaign_id": r.campaign_id,
            "agent": r.agent_name,
            "task": r.task,
            "output": r.output,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reviews
    ]


@router.post("/review/{review_id}/approve")
def approve_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(ReviewRequest).filter(ReviewRequest.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Approval request not found")
    if review.status != "pending_approval":
        raise HTTPException(status_code=409, detail="Approval request already decided")
    # Unblock the orchestrator thread; it will write the ApprovalLog entry
    submit_decision(review_id, "approved")
    return {"review_id": review_id, "decision": "approved"}


@router.post("/review/{review_id}/reject")
def reject_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(ReviewRequest).filter(ReviewRequest.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Approval request not found")
    if review.status != "pending_approval":
        raise HTTPException(status_code=409, detail="Approval request already decided")
    submit_decision(review_id, "rejected")
    return {"review_id": review_id, "decision": "rejected"}


@router.get("/approval-logs")
def get_approval_logs(
    campaign_id: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Immutable audit trail of every approve/reject decision with timestamps."""
    query = db.query(ApprovalLog).order_by(desc(ApprovalLog.decided_at))
    if campaign_id:
        query = query.filter(ApprovalLog.campaign_id == campaign_id)
    entries = query.limit(limit).all()
    return [
        {
            "id": e.id,
            "review_request_id": e.review_request_id,
            "campaign_id": e.campaign_id,
            "agent_name": e.agent_name,
            "task": e.task,
            "decision": e.decision,
            "decided_at": e.decided_at.isoformat() if e.decided_at else None,
        }
        for e in entries
    ]
