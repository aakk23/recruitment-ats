import os
from typing import Dict, List

from .basic_info import extract_text_by_ext, parse_resume_details
from .education import extract_education
from .experience import extract_experience
from .links import extract_social_links
from .skills import extract_skills


class ResumeParserError(ValueError):
    pass


def _normalize_resume_data(resume_data: dict) -> Dict:
    emails = resume_data.get("emails") or []
    phones = resume_data.get("phones") or []

    education = []
    for e in (resume_data.get("Education") or []):
        education.append(
            {
                "degree": e.get("Degree", "") if isinstance(e, dict) else "",
                "institution": e.get("Institution", "") if isinstance(e, dict) else "",
                "year": e.get("Date", "") if isinstance(e, dict) else "",
            }
        )

    experience = []
    for ex in (resume_data.get("Experience") or []):
        experience.append(
            {
                "company": ex.get("Company", "") if isinstance(ex, dict) else "",
                "title": ex.get("Position", "") if isinstance(ex, dict) else "",
                "duration": ex.get("Date", "") if isinstance(ex, dict) else "",
            }
        )

    return {
        "name": resume_data.get("name") or "",
        "email": emails[0] if emails else "",
        "phone": phones[0] if phones else "",
        "skills": resume_data.get("Skills") or [],
        "education": education,
        "experience": experience,
        "social_links": resume_data.get("Social Links") or {},
    }


def parse_resume_file(file_bytes: bytes, filename: str) -> Dict:
    ext = os.path.splitext((filename or "").lower())[1]
    if ext not in {".pdf", ".docx"}:
        raise ResumeParserError("Unsupported format. Only PDF and DOCX are allowed.")
    if not file_bytes:
        raise ResumeParserError("Uploaded resume is empty")

    try:
        text = extract_text_by_ext(file_bytes, ext)
    except Exception as exc:
        raise ResumeParserError(f"Could not extract text from resume: {exc}") from exc

    if not (text or "").strip():
        raise ResumeParserError("No readable text found in resume")

    basic_info = parse_resume_details(text)
    skills = extract_skills(text)
    social_links = extract_social_links(text)
    education = extract_education(text)
    experience = extract_experience(text)

    resume_data = {
        "name": basic_info.get("candidate_name"),
        "emails": basic_info.get("emails", []),
        "phones": basic_info.get("phones", []),
        "Social Links": social_links,
        "Skills": skills,
        "Education": education,
        "Experience": experience,
    }
    return _normalize_resume_data(resume_data)


def parse_resume_batch_files(files: List[Dict[str, bytes]]) -> List[Dict]:
    return [parse_resume_file(item["bytes"], item["filename"]) for item in files]
