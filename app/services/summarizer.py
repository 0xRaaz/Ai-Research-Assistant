import time
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv
import os

load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GEMINI_API_KEY"),
    temperature=0.2
)


def load_full_text(filename: str) -> str:
    """Load full processed text from data/processed/"""

    base_name = os.path.splitext(filename)[0]
    file_path = os.path.join("data/processed", f"{base_name}.txt")

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Processed file not found: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()


def generate_short_summary(filename: str) -> str:
    """Generate a 3-5 sentence short summary."""

    text = load_full_text(filename)

    # Use first 3000 characters for short summary
    excerpt = text[:3000]

    messages = [
        SystemMessage(content="You are an AI Research Assistant that summarizes research papers."),
        HumanMessage(content=f"""Summarize this research paper in 3-5 sentences.
Be concise and capture only the most important points.

Paper content:
{excerpt}

Short Summary:""")
    ]

    response = llm.invoke(messages)
    return response.content


def generate_detailed_summary(filename: str) -> str:
    """Generate a detailed paragraph summary."""

    text = load_full_text(filename)

    # Use first 6000 characters for detailed summary
    excerpt = text[:6000]

    messages = [
        SystemMessage(content="You are an AI Research Assistant that summarizes research papers."),
        HumanMessage(content=f"""Write a detailed summary of this research paper.
Cover the problem, methodology, key findings, and conclusions.
Write in clear paragraphs.

Paper content:
{excerpt}

Detailed Summary:""")
    ]

    response = llm.invoke(messages)
    return response.content


def generate_sectionwise_summary(filename: str) -> dict:
    """Generate section-wise summary covering key research sections."""

    text = load_full_text(filename)
    excerpt = text[:6000]

    sections = ["Abstract", "Introduction", "Methodology", "Results", "Conclusion"]
    section_summaries = {}

    for section in sections:
        messages = [
            SystemMessage(content="You are an AI Research Assistant."),
            HumanMessage(content=f"""From this research paper content, extract and summarize the '{section}' section.
If the section is not clearly present, summarize what is most relevant to '{section}'.
Keep it to 2-3 sentences.

Paper content:
{excerpt}

{section} Summary:""")
        ]

        response = llm.invoke(messages)
        section_summaries[section.lower()] = response.content
        time.sleep(15)

    return section_summaries