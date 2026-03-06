import re
from urllib.parse import urlparse


def categorize_social_link(url):
    domain = urlparse(url).netloc.lower()
    platforms = {
        "www.linkedin.com": "LinkedIn",
        "linkedin.com": "LinkedIn",
        "www.github.com": "GitHub",
        "github.com": "GitHub",
        "www.twitter.com": "Twitter",
        "twitter.com": "Twitter",
        "x.com": "Twitter",
        "www.facebook.com": "Facebook",
        "facebook.com": "Facebook",
        "www.instagram.com": "Instagram",
        "instagram.com": "Instagram",
        "www.medium.com": "Medium",
        "medium.com": "Medium",
        "www.stackoverflow.com": "Stack Overflow",
        "stackoverflow.com": "Stack Overflow",
        "www.hackerrank.com": "HackerRank",
        "hackerrank.com": "HackerRank",
        "www.leetcode.com": "LeetCode",
        "leetcode.com": "LeetCode",
    }

    for platform_domain, platform_name in platforms.items():
        if platform_domain in domain:
            return platform_name
    return "Other"


def _is_valid_url(url: str) -> bool:
    return bool(re.match(r"^https?://[^\s]+$", url or ""))


def extract_social_links(text: str):
    url_matches = re.findall(r"(https?://[^\s]+)", text)
    social_patterns = {
        "linkedin": r"linkedin\.com/in/[\w-]+",
        "github": r"github\.com/[\w-]+",
        "twitter": r"twitter\.com/[\w-]+",
        "medium": r"medium\.com/@?[\w-]+",
    }

    all_links = set(url_matches)
    for _, pattern in social_patterns.items():
        matches = re.findall(pattern, text, re.I)
        all_links.update(f"https://{match}" for match in matches)

    categorized = {}
    for link in all_links:
        clean_link = re.sub(r'[,.)\]>"]$', '', link)
        if _is_valid_url(clean_link):
            category = categorize_social_link(clean_link)
            categorized.setdefault(category, [])
            if clean_link not in categorized[category]:
                categorized[category].append(clean_link)

    return categorized
