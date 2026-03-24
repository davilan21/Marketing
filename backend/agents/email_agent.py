from crewai import Agent, Task
from crewai import LLM


def create_email_agent(llm: LLM) -> Agent:
    return Agent(
        role="Email Marketing Specialist",
        goal=(
            "Design high-converting email marketing campaigns with personalized "
            "sequences, compelling subject lines, and optimized send strategies."
        ),
        backstory=(
            "You are an email marketing expert with mastery of deliverability, "
            "segmentation, A/B testing, and behavioral automation. You craft email "
            "sequences that nurture leads and drive measurable revenue."
        ),
        llm=llm,
        verbose=True,
        allow_delegation=False,
    )


def create_email_task(agent: Agent, campaign_input: dict, content_output: str) -> Task:
    campaign_name = campaign_input.get("name", "Campaign")
    target_audience = campaign_input.get("target_audience", "general audience")
    goals = campaign_input.get("goals", "increase conversions")

    return Task(
        description=(
            f"Design a complete email campaign sequence for '{campaign_name}'. "
            f"Audience: {target_audience}. Goals: {goals}. "
            f"\n\nContent strategy context:\n{content_output}\n\n"
            "Create: "
            "1. Welcome email (subject line + full body), "
            "2. Nurture sequence (3 emails with subjects and bodies), "
            "3. Promotional email (subject line + body with clear CTA), "
            "4. Re-engagement email for inactive subscribers, "
            "5. Send schedule with optimal timing recommendations, "
            "6. A/B test suggestions for subject lines. "
            "Each email should have a clear goal, personalization tokens, and compelling CTA."
        ),
        expected_output=(
            "A complete 5-email sequence with subject lines, full body copy, "
            "send schedule, and A/B testing recommendations."
        ),
        agent=agent,
    )
