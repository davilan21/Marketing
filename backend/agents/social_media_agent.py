from crewai import Agent, Task
from crewai import LLM


def create_social_media_agent(llm: LLM) -> Agent:
    return Agent(
        role="Social Media Marketing Manager",
        goal=(
            "Develop platform-specific social media strategies, create viral-worthy "
            "content, and build engaged communities that amplify brand reach."
        ),
        backstory=(
            "You are a social media expert with deep knowledge of platform algorithms, "
            "trending formats, influencer partnerships, and community management. "
            "You create thumb-stopping content that drives shares, saves, and conversions."
        ),
        llm=llm,
        verbose=True,
        allow_delegation=False,
    )


def create_social_media_task(agent: Agent, campaign_input: dict, content_output: str) -> Task:
    campaign_name = campaign_input.get("name", "Campaign")
    target_audience = campaign_input.get("target_audience", "general audience")

    return Task(
        description=(
            f"Create a social media strategy for '{campaign_name}' targeting '{target_audience}'. "
            f"\n\nContent strategy context:\n{content_output}\n\n"
            "Produce: "
            "1. Platform strategy for LinkedIn, Instagram, Twitter/X, and TikTok, "
            "2. 10 post ideas with captions and hashtags (mix of platforms), "
            "3. 2 short-form video scripts (30-60 seconds each), "
            "4. Story/Reel concepts (5 ideas), "
            "5. Community engagement tactics and response templates, "
            "6. Influencer collaboration brief, "
            "7. Paid social ad targeting recommendations. "
            "Tailor tone and format to each platform's unique culture."
        ),
        expected_output=(
            "A comprehensive social media plan with platform strategies, post copy, "
            "video scripts, story concepts, and paid social recommendations."
        ),
        agent=agent,
    )
