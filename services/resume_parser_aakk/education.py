import re


def extract_education(text: str):
    education_info = []
    education_section = re.search(
        r"(?:education|academic background|qualifications)(?::|.{0,10})\s*((?:.+\n){1,30})",
        text,
        re.I,
    )

    if education_section:
        section_text = education_section.group(1)
        degree_patterns = {
            "degree": r"((?:B\.?S\.?|M\.?S\.?|Ph\.?D\.?|Bachelor|Master|Doctor|MBA|B\.?A\.?|M\.?A\.?)[^,\n]{0,50})",
            "institution": r"((?:University|College|Institute|School)[^,\n]{0,100})",
            "date": r"(\d{4}\s*(?:-|to)\s*\d{4}|\d{4}\s*-\s*present|\d{4})",
        }

        degrees = re.findall(degree_patterns["degree"], section_text, re.I)
        institutions = re.findall(degree_patterns["institution"], section_text, re.I)
        dates = re.findall(degree_patterns["date"], section_text)

        for i in range(min(len(degrees), len(institutions))):
            education_info.append(
                {
                    "Degree": degrees[i].strip(),
                    "Institution": institutions[i].strip(),
                    "Date": dates[i].strip() if i < len(dates) else "",
                }
            )

    return education_info
