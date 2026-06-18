from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv
import os
import json

load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GEMINI_API_KEY"),
    temperature=0.0
)


def load_full_text(filename: str) -> str:
    base_name = os.path.splitext(filename)[0]
    file_path = os.path.join("data/processed", f"{base_name}.txt")
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Processed file not found: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()


def clean_json_response(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


def extract_citations(filename: str) -> dict:
    text = load_full_text(filename)
    excerpt = text[-4000:]

    messages = [
        SystemMessage(content="You are an AI Research Assistant that extracts citations. Always respond with valid JSON only. No extra text, no markdown, no explanation."),
        HumanMessage(content=(
            "Extract all references and citations from this research paper.\n\n"
            "Return ONLY a JSON object in this exact format:\n"
            "{\n"
            '  "total_citations": <number>,\n'
            '  "citations": [\n'
            "    {\n"
            '      "index": 1,\n'
            '      "authors": "Author names here",\n'
            '      "title": "Paper title here",\n'
            '      "year": "Publication year",\n'
            '      "journal": "Journal or conference name",\n'
            '      "full_citation": "Complete citation text"\n'
            "    }\n"
            "  ]\n"
            "}\n\n"
            f"Paper content (references section):\n{excerpt}"
        ))
    ]

    response = llm.invoke(messages)

    try:
        raw = clean_json_response(response.content)
        result = json.loads(raw)
        return result
    except json.JSONDecodeError:
        return {
            "total_citations": 0,
            "citations": [],
            "raw_response": response.content
        }


def extract_paper_metadata(filename: str) -> dict:
    text = load_full_text(filename)
    excerpt = text[:3000]

    messages = [
        SystemMessage(content="You are an AI Research Assistant that extracts paper metadata. Always respond with valid JSON only. No extra text, no markdown."),
        HumanMessage(content=(
            "Extract the metadata from this research paper.\n\n"
            "Return ONLY a JSON object in this exact format:\n"
            "{\n"
            '  "title": "Paper title here",\n'
            '  "authors": ["Author 1", "Author 2"],\n'
            '  "year": "Publication year if found",\n'
            '  "abstract": "Abstract text here",\n'
            '  "keywords": ["keyword1", "keyword2"]\n'
            "}\n\n"
            f"Paper content:\n{excerpt}"
        ))
    ]

    response = llm.invoke(messages)

    try:
        raw = clean_json_response(response.content)
        result = json.loads(raw)
        return result
    except json.JSONDecodeError:
        return {
            "title": "Could not extract",
            "authors": [],
            "year": "Unknown",
            "abstract": "Could not extract",
            "keywords": []
        }