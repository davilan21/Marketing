from crewai import Agent, Task, LLM


def create_social_media_agent(llm: LLM) -> Agent:
    return Agent(
        role="Social Media Marketing Manager",
        goal=(
            "Develop platform-specific social media strategies and create "
            "compelling, viral-worthy content tailored to each platform's unique culture."
        ),
        backstory=(
            "You are a social media expert with deep knowledge of platform algorithms, "
            "trending formats, and community management. You create thumb-stopping content "
            "that drives shares, saves, and conversions."
        ),
        llm=llm,
        verbose=True,
        allow_delegation=False,
    )


def create_social_media_task(agent: Agent, campaign_input: dict, content_output: str) -> Task:
    campaign_name   = campaign_input.get("name", "Campaign")
    target_audience = campaign_input.get("target_audience", "general audience")

    return Task(
        description=(
            f"Create platform-specific social media posts for '{campaign_name}' "
            f"targeting '{target_audience}'.\n\n"
            f"Content strategy context:\n{content_output}\n\n"
            "You MUST respond with valid JSON only — no markdown fences, no prose outside the JSON.\n\n"
            "Required JSON structure:\n"
            "{\n"
            '  "instagram": "<caption up to 2200 chars, include relevant hashtags>",\n'
            '  "linkedin":  "<professional post up to 3000 chars, thought-leadership tone>",\n'
            '  "tiktok":    "<short punchy text up to 2200 chars, trending/casual voice>",\n'
            '  "strategy":  "<2-3 sentence summary of the overall social strategy>"\n'
            "}\n\n"
            "Guidelines per platform:\n"
            "- Instagram: visual storytelling, 3-10 hashtags, emoji-friendly\n"
            "- LinkedIn: professional insight, data-driven, minimal emoji\n"
            "- TikTok: casual/Gen-Z tone, hook in first line, trending references\n"
        ),
        expected_output=(
            "Valid JSON object with keys: instagram, linkedin, tiktok, strategy. "
            "No markdown code fences. No text outside the JSON."
        ),
        agent=agent,
    )
