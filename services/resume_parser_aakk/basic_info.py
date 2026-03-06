import re
from typing import Optional

from utils.text_extractor import extract_text_from_pdf, extract_text_from_docx


def extract_text_by_ext(file_bytes: bytes, ext: str) -> str:
    if ext == ".pdf":
        return extract_text_from_pdf(file_bytes)
    if ext == ".docx":
        return extract_text_from_docx(file_bytes)
    raise ValueError("Unsupported format")


def get_email_prefix(email: str) -> str:
    return email.split("@", 1)[0]


def clean_and_tokenize(text: str):
    return re.findall(r"\b\w+\b", text.lower())


def generate_search_keys(email_prefix: str):
    search_keys = set()
    length = len(email_prefix)
    for i in range(2, length + 1):
        search_keys.add(email_prefix[:i])
    for i in range(length - 1, 0, -1):
        search_keys.add(email_prefix[i:])
    return list(search_keys)


def score_match(search_key: str, word: str):
    if word == search_key:
        return 100
    if word.startswith(search_key) or word.endswith(search_key):
        return 75
    if search_key in word:
        return 50
    return 0


def clean_name_format(name: Optional[str]) -> Optional[str]:
    if not name:
        return None
    name = re.sub(r"[^a-zA-Z\s]", "", name)
    return " ".join(word.capitalize() for word in name.split())


def email_proximity_search(text: str, email: str) -> Optional[str]:
    if email:
        text = text.replace(email, "")

    tokens = clean_and_tokenize(text)
    email_prefix = get_email_prefix(email)

    if email_prefix in tokens:
        return clean_name_format(email_prefix)

    search_keys = generate_search_keys(email_prefix)
    best_word, best_score = None, 0
    for word in tokens:
        for key in search_keys:
            score = score_match(key, word)
            if score > best_score:
                best_score = score
                best_word = word

    return clean_name_format(best_word) if best_word else None


def name_matches_email(name: Optional[str], email: str):
    if not name:
        return False
    email_prefix = get_email_prefix(email).lower()
    return any(part.lower() in email_prefix for part in name.split())


def extract_email(text: str):
    match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text)
    return match.group(0) if match else None


def extract_phone(text: str):
    cleaned_text = re.sub(r"\s+", " ", text)
    patterns = [
        r"\+\d{1,3}[-\s]?\d{5,12}",
        r"\+?\d{1,3}[-\s]?\d{3,4}[-\s]?\d{3,4}",
        r"\d{10,12}",
        r"\+?\d[\d\s\-()\n]{8,}\d",
    ]

    for pattern in patterns:
        matches = re.findall(pattern, cleaned_text)
        if matches:
            raw_phone = re.sub(r"\D", "", matches[0])
            return raw_phone[-10:] if len(raw_phone) > 10 else raw_phone
    return None


def extract_name(text: str, email: str):
    lines = text.splitlines()
    first_15_lines = lines[:15]
    name_candidate = None

    for line in first_15_lines:
        line = line.strip()
        if len(line.split()) in [2, 3] and not any(char.isdigit() for char in line):
            name_candidate = line
            if name_matches_email(name_candidate, email):
                return clean_name_format(name_candidate)
            break

    return email_proximity_search(text, email)


def parse_resume_details(text: str):
    email = extract_email(text)
    phone = extract_phone(text)
    name = extract_name(text, email) if email else None

    return {
        "candidate_name": name,
        "emails": [email] if email else [],
        "phones": [phone] if phone else [],
    }
