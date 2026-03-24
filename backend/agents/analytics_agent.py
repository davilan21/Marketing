from crewai import Agent, Task
from crewai import LLM


def create_analytics_agent(llm: LLM) -> Agent:
    return Agent(
        role="Marketing Analytics Specialist",
        goal=(
            "Analyze marketing data, identify trends, measure campaign performance, "
            "and provide data-driven insights to optimize marketing strategies."
        ),
        backstory=(
            "You are an expert marketing analyst with deep knowledge of KPIs, "
            "conversion funnels, audience segmentation, and ROI measurement. "
            "You transform raw data into actionable marketing intelligence."
        ),
        llm=llm,
        verbose=True,
        allow_delegation=False,
    )


def create_analytics_task(agent: Agent, campaign_input: dict) -> Task:
    campaign_name = campaign_input.get("name", "Campaign")
    target_audience = campaign_input.get("target_audience", "general audience")
    goals = campaign_input.get("goals", "increase brand awareness")

    return Task(
        description=(
            f"Analyze the marketing campaign '{campaign_name}' targeting '{target_audience}'. "
            f"Campaign goals: {goals}. "
            "Provide: "
            "1. Target audience breakdown and personas, "
            "2. Key performance indicators (KPIs) to track, "
            "3. Competitive landscape insights, "
            "4. Recommended channels and budget allocation percentages, "
            "5. Success metrics and benchmarks. "
            "Format the output as a structured analytics report."
        ),
        expected_output=(
            "A structured analytics report with audience analysis, KPIs, "
            "channel recommendations, and measurable success benchmarks."
        ),
        agent=agent,
    )
