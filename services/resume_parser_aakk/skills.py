import re


def load_skills_dictionary():
    skills_categories = {
        "programming_languages": [
            "python", "java", "c++", "c#", "javascript", "typescript", "ruby", "php",
            "go", "rust", "swift", "kotlin", "scala", "perl", "r", "matlab", "dart",
            "html", "css", "sql", "nosql", "shell", "bash", "powershell", "julia",
        ],
        "frameworks_libraries": [
            "react", "angular", "vue", "django", "flask", "spring", "express", "aspnet",
            "laravel", "symfony", "rails", "pytorch", "tensorflow", "keras", "scikit-learn",
            "pandas", "numpy", "matplotlib", "seaborn", "bootstrap", "jquery", "node.js",
            "next.js", "gatsby", "flutter", "react native", "tailwind", "d3.js",
        ],
        "databases": [
            "mysql", "postgresql", "oracle", "sql server", "mongodb", "dynamodb", "cassandra",
            "redis", "elasticsearch", "firebase", "neo4j", "couchdb", "sqlite", "mariadb",
        ],
        "tools_platforms": [
            "git", "docker", "kubernetes", "jenkins", "aws", "azure", "gcp", "heroku",
            "jira", "confluence", "slack", "trello", "github", "gitlab", "bitbucket",
            "terraform", "ansible", "puppet", "chef", "grafana", "prometheus", "kibana",
            "tableau", "power bi", "looker", "excel", "powerpoint", "photoshop",
            "illustrator", "figma", "sketch", "adobe xd", "postman", "swagger",
        ],
        "soft_skills": [
            "communication", "teamwork", "leadership", "problem solving", "critical thinking",
            "time management", "adaptability", "creativity", "analytical skills", "attention to detail",
            "organization", "decision making", "interpersonal skills", "presentation", "negotiation",
            "conflict resolution", "emotional intelligence", "project management", "mentoring",
        ],
        "methodologies": [
            "agile", "scrum", "kanban", "waterfall", "lean", "devops", "ci/cd",
            "test driven development", "behavior driven development", "design thinking",
            "object oriented programming", "functional programming", "microservices",
            "restful api", "soap", "graphql", "machine learning", "deep learning",
            "natural language processing", "computer vision", "data mining", "big data",
            "etl", "data warehousing", "business intelligence", "user experience design",
        ],
    }
    all_skills = [skill for category in skills_categories.values() for skill in category]
    return {skill.lower(): True for skill in all_skills}


def extract_skills(text: str):
    skills = set()
    skills_dict = load_skills_dictionary()
    text_lower = text.lower()

    for skill in skills_dict:
        if re.search(r"\b" + re.escape(skill) + r"\b", text_lower):
            skills.add(skill.title())

    skill_sections = re.findall(
        r"(?:skills|technical skills|core competencies|expertise)(?::|.{0,10})\s*((?:.+\n){1,15})",
        text_lower,
        re.I,
    )
    for section in skill_sections:
        items = re.split(r"[,•|]|\n", section)
        for item in items:
            cleaned_item = item.strip().lower()
            if cleaned_item and len(cleaned_item) > 2:
                if cleaned_item in skills_dict:
                    skills.add(cleaned_item.title())
                elif 2 <= len(cleaned_item.split()) <= 3:
                    skills.add(cleaned_item.title())

    proficiency_matches = re.findall(
        r"(?:proficient in|experience with|knowledge of|familiar with)\s*(.{3,50}?)(?:\.|,|\n)",
        text_lower,
    )
    for match in proficiency_matches:
        words = match.split()
        for i in range(len(words)):
            if words[i] in skills_dict:
                skills.add(words[i].title())
            if i < len(words) - 1:
                two_word = words[i] + " " + words[i + 1]
                if two_word in skills_dict:
                    skills.add(two_word.title())

    return sorted(skills)
