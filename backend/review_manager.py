import threading

# review_id -> threading.Event
_review_events: dict[int, threading.Event] = {}
# review_id -> "approved" | "rejected"
_review_decisions: dict[int, str] = {}


def create_review_event(review_id: int) -> threading.Event:
    event = threading.Event()
    _review_events[review_id] = event
    return event


def wait_for_review(review_id: int, timeout: float = 600) -> str:
    """Block the calling thread until a decision is made or timeout expires."""
    event = _review_events.get(review_id)
    if event:
        decided = event.wait(timeout=timeout)
        if not decided:
            # Auto-approve on timeout
            return "approved"
    return _review_decisions.get(review_id, "approved")


def submit_decision(review_id: int, decision: str):
    """Called from the API endpoint to unblock the waiting orchestrator thread."""
    _review_decisions[review_id] = decision
    if review_id in _review_events:
        _review_events[review_id].set()
