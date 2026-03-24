import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers.campaigns import router as campaigns_router
from ws_manager import manager

app = FastAPI(
    title="Marketing Agent System",
    description="CrewAI-powered marketing automation with 4 specialised agents",
    version="2.0.0",
)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(campaigns_router)


@app.on_event("startup")
async def startup_event():
    # Capture the running event loop so the WS manager can broadcast
    # from background threads (orchestrator runs in thread-pool).
    manager.set_loop(asyncio.get_running_loop())
    init_db()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive; ignore inbound messages.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/")
def root():
    return {
        "service": "Marketing Agent System",
        "version": "2.0.0",
        "agents": ["Analytics Agent", "Content Agent", "Email Agent", "Social Media Agent"],
        "websocket": "/ws",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
