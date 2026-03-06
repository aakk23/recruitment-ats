from services.resume_parser_aakk.basic_info import extract_email, extract_phone
from services.resume_parser_aakk.education import extract_education
from services.resume_parser_aakk.experience import extract_experience
from services.resume_parser_aakk.skills import extract_skills


def test_extract_basic_email_phone():
    text = "John Doe\njohn.doe@email.com\n+1-555-1234"
    assert extract_email(text) == "john.doe@email.com"
    assert extract_phone(text) is not None


def test_extract_skills_multiple():
    text = "Skills: Python, SQL, FastAPI, Docker"
    skills = extract_skills(text)
    assert "Python" in skills
    assert "Sql" in skills or "SQL" in skills


def test_extract_education_and_experience_sections():
    text = """
    Education:
    B.Tech Computer Science
    Anna University
    2018 - 2022

    Work Experience:
    Infosys
    Software Engineer
    2022-2024
    - Built APIs
    """
    education = extract_education(text)
    experience = extract_experience(text)
    assert isinstance(education, list)
    assert isinstance(experience, list)
