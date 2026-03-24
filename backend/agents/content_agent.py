from crewai import Agent, Task
from crewai import LLM


def create_content_agent(llm: LLM) -> Agent:
    return Agent(
        role="Content Marketing Strategist",
        goal=(
            "Create compelling, on-brand content strategies and copy that engage "
            "target audiences, drive conversions, and align with campaign objectives."
        ),
        backstory=(
            "You are a seasoned content strategist and copywriter with expertise in "
            "storytelling, SEO-driven content, and multi-format content creation. "
            "You craft narratives that resonate with audiences and inspire action."
        ),
        llm=llm,
        verbose=True,
        allow_delegation=False,
    )


def create_content_task(agent: Agent, campaign_input: dict, analytics_output: str) -> Task:
    campaign_name = campaign_input.get("name", "Campaign")
    target_audience = campaign_input.get("target_audience", "general audience")
    description = campaign_input.get("description", "")

    return Task(
        description=(
            f"Based on the analytics report below, create a content strategy for '{campaign_name}'. "
            f"Target audience: {target_audience}. Campaign description: {description}. "
            f"\n\nAnalytics insights:\n{analytics_output}\n\n"
            "Deliver: "
            "1. Content pillars and themes (3-5 pillars), "
            "2. Blog post ideas with headlines (5 ideas), "
            "3. Landing page copy (headline, subheadline, 3 key value propositions, CTA), "
            "4. Ad copy variations (3 variants for different channels), "
            "5. Content calendar outline for 4 weeks. "
            "Ensure all content is tailored to the identified audience segments."
        ),
        expected_output=(
            "A complete content strategy including pillars, blog ideas, landing page copy, "
            "ad copy variants, and a 4-week content calendar."
        ),
        agent=agent,
    )
