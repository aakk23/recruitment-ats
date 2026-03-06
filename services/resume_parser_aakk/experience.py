import re


def extract_experience(text: str):
    experience_info = []
    experience_section = re.search(
        r"(?:experience|work experience|employment|work history)(?::|.{0,10})\s*((?:.+\n){1,100})",
        text,
        re.I,
    )

    if experience_section:
        section_text = experience_section.group(1)
        positions = re.split(r"(\d{4}\s*(?:-|to)\s*\d{4}|\d{4}\s*-\s*present|\d{4})", section_text)

        for i in range(1, len(positions), 2):
            if i < len(positions) - 1:
                date_range = positions[i].strip()
                description = positions[i + 1].strip()

                experience_info.append(
                    {
                        "Date": date_range,
                        "Company": next(iter(re.findall(r"^([^•\n\d]{5,100})", description, re.M)), "").strip(),
                        "Position": next(iter(re.findall(r"^([^•\n\d]{5,50})", description, re.M)), "").strip(),
                        "Responsibilities": re.findall(r"[•-]\s*([^\n•-][^\n]*)", description),
                    }
                )

    return experience_info
