from docx import Document
from docx.oxml import OxmlElement
from docx.text.paragraph import Paragraph
import os
import shutil

src = r"C:\Users\kate angel\Downloads\Appendices_and_CV.docx"
backup = src.replace(".docx", "_backup_before_edit.docx")
if not os.path.exists(backup):
    shutil.copy2(src, backup)


def insert_paragraph_after(paragraph, text=""):
    new_p = OxmlElement("w:p")
    paragraph._p.addnext(new_p)
    new_para = Paragraph(new_p, paragraph._parent)
    if text:
        new_para.add_run(text)
    return new_para


FORM_B1 = "https://docs.google.com/forms/d/e/1FAIpQLSftkvc1oE8J2H68RmaROgNasiRjAflrtIX4i08hfOtADL_JOQ/viewform?usp=header"
FORM_B2 = "https://docs.google.com/forms/d/e/1FAIpQLSdQ5dzCdp66A2wF3KSc5plCIO1WGJ1rknUV_a3Bd2UVgM4t4g/viewform?usp=header"
FORM_B3 = "https://docs.google.com/forms/d/e/1FAIpQLScXyaLEjEPiFFxZbVQC0vFYSjW7GWDzQ7Yy9cg8GcfYCD0cDw/viewform?usp=header"

CONSENT = (
    "This survey is part of the capstone project entitled "
    "“DAET Tourism Crisis Communication and Emergency Alert System,” conducted by "
    "fourth-year BS in Information Technology students of Our Lady of Lourdes College Foundation.\n\n"
    "The survey aims to understand how residents and tourists/visitors access tourism-related advisories, "
    "the challenges they encounter when seeking reliable information, and the information they need during "
    "emergencies affecting tourism in Daet, Camarines Norte.\n\n"
    "Purpose of the study. This study focuses on developing and evaluating a web-based system for accessing "
    "tourism-related crisis alerts, safety information, and incident reporting features relevant to Daet, Camarines Norte.\n\n"
    "What participation involves. You will answer a short survey about your experiences accessing tourism advisories, "
    "the difficulties you may encounter, and your preferred sources of emergency information.\n\n"
    "Voluntary participation. Your participation is voluntary. You may decline to participate or stop answering at any time.\n\n"
    "Privacy and confidentiality. Your responses will be used for academic research purposes. The researchers will limit "
    "the collection and use of personal information to what is necessary for the study.\n\n"
    "Participation is voluntary and takes approximately 5–10 minutes. Your responses will be used for academic research "
    "purposes and handled confidentially in accordance with the study's data protection procedures."
)

B3_LINES = [
    "Google Form URL: " + FORM_B3,
    "",
    "USER EVALUATION QUESTIONNAIRE – DAET Tourism Crisis Communication and Emergency Alert System",
    "",
    "Good day!",
    "",
    "We are conducting a user evaluation of the DAET Tourism Crisis Communication and Emergency Alert System, a system "
    "designed to provide tourism-related crisis information, emergency alerts, advisories, incident reporting, and other "
    "related services for Daet, Camarines Norte.",
    "",
    "This questionnaire aims to evaluate the system's functionality, usability, notification services, and overall "
    "usefulness based on your experience while using it.",
    "",
    "Your participation is voluntary. Your responses will be kept confidential and will be used for academic research "
    "and system evaluation purposes only.",
    "",
    "Please explore the available features of the system before answering. If you have not tried a particular feature or "
    "notification channel, select Not Observed / Not Tested rather than guessing.",
    "",
    "Thank you for your participation!",
    "",
    "Part I. Respondent Profile",
    "",
    "1. What is your age group?",
    "[  ] Below 18    [  ] 18–24    [  ] 25–34    [  ] Other: __________________",
    "",
    "2. What is your respondent category?",
    "[  ] Resident of Daet    [  ] Tourist / Visitor    [  ] Other: __________________",
    "",
    "3. How often do you use websites or mobile applications?",
    "[  ] Very often    [  ] Often    [  ] Sometimes    [  ] Rarely    [  ] Never",
    "",
    "4. What device did you use to access the system? (Check all that apply.)",
    "[  ] Desktop computer    [  ] Laptop    [  ] Android smartphone / iPhone (iOS)    [  ] Tablet    [  ] Other: __________________",
    "",
    "5. Which system features did you try? (Check all that apply.)",
    "[  ] Crisis alerts and advisories    [  ] Hazard maps and safe routes    [  ] Incident reporting",
    "[  ] Crisis feedback    [  ] Points and rewards    [  ] User guide",
    "[  ] Tourist guide assistance    [  ] Notifications",
    "",
    "Part II. Evaluation Indicators",
    "",
    "Directions: Rate each statement using the scale below.",
    "Scale: 5 – Strongly Agree; 4 – Agree; 3 – Neutral; 2 – Disagree; 1 – Strongly Disagree; N/O – Not Observed / Not Tested",
    "",
    "Notification Services",
    "6. Notifications reach me through the channels I use or expect (channel delivery and reach).",
    "[  ] 5    [  ] 4    [  ] 3    [  ] 2    [  ] 1    [  ] N/O",
    "",
    "7. Emergency messages and instructions are clear and easy to read (message clarity and readability).",
    "[  ] 5    [  ] 4    [  ] 3    [  ] 2    [  ] 1    [  ] N/O",
    "",
    "8. System updates and broadcasts provide timely, relevant information (relevant system update information).",
    "[  ] 5    [  ] 4    [  ] 3    [  ] 2    [  ] 1    [  ] N/O",
    "",
    "Usability and User Experience",
    "9. Crisis alerts and advisories are displayed clearly on the Crisis Hub.",
    "[  ] 5    [  ] 4    [  ] 3    [  ] 2    [  ] 1    [  ] N/O",
    "",
    "10. Buttons, maps, forms, and other features worked as I expected.",
    "[  ] 5    [  ] 4    [  ] 3    [  ] 2    [  ] 1    [  ] N/O",
    "",
    "11. Moving between pages and sections of the system is easy.",
    "[  ] 5    [  ] 4    [  ] 3    [  ] 2    [  ] 1    [  ] N/O",
    "",
    "12. Important information (alerts, maps, hotlines) is easy to find on the screen.",
    "[  ] 5    [  ] 4    [  ] 3    [  ] 2    [  ] 1    [  ] N/O",
    "",
    "13. Information on the system is organized in a way that is easy to understand.",
    "[  ] 5    [  ] 4    [  ] 3    [  ] 2    [  ] 1    [  ] N/O",
    "",
    "14. I can complete tasks such as viewing advisories or submitting an incident report with minimal effort.",
    "[  ] 5    [  ] 4    [  ] 3    [  ] 2    [  ] 1    [  ] N/O",
    "",
    "System Utility",
    "15. The system improves my perception of tourism safety in Daet.",
    "[  ] 5    [  ] 4    [  ] 3    [  ] 2    [  ] 1    [  ] N/O",
    "",
    "16. The system makes it easier to access emergency or crisis information in Daet than before.",
    "[  ] 5    [  ] 4    [  ] 3    [  ] 2    [  ] 1    [  ] N/O",
    "",
    "Overall Satisfaction",
    "17. Overall, I am satisfied with CONNECT-DAET as an emergency communication platform.",
    "[  ] 5    [  ] 4    [  ] 3    [  ] 2    [  ] 1    [  ] N/O",
    "",
    "Part III. Comments and Suggestions",
    "18. What did you like most about the system?",
    "________________________________________________________________________________",
    "",
    "19. What should be improved?",
    "________________________________________________________________________________",
    "",
    "20. What other features or suggestions would you recommend?",
    "________________________________________________________________________________",
]

doc = Document(src)
urls_added = {"b1": False, "b2": False}

for p in doc.paragraphs:
    if p.text == "[Copy the study information text from the Google Form here.]":
        p.text = CONSENT

# Refresh paragraph list after mutations
paras = list(doc.paragraphs)
for p in paras:
    t = p.text.strip()
    if t == "B.1 Preliminary Needs Assessment Survey" and not urls_added["b1"]:
        insert_paragraph_after(p, "Google Form URL: " + FORM_B1)
        urls_added["b1"] = True
    elif (
        t == "B.2 System Evaluation Questionnaire (ISO/IEC 25010 Functional Suitability)"
        and not urls_added["b2"]
    ):
        insert_paragraph_after(p, "Google Form URL: " + FORM_B2)
        urls_added["b2"] = True
    elif t == "Insert the User Evaluation Questionnaire here.":
        anchor = p
        anchor.text = B3_LINES[0]
        prev = anchor
        for line in B3_LINES[1:]:
            prev = insert_paragraph_after(prev, line)

for p in doc.paragraphs:
    if p.text.strip() == "[  ] IT Professional" and "[  ] IT Instructor" not in p.text:
        pass
    if p.text.strip() == "[Add any other classification choice shown in the Google Form.]":
        p.text = "[  ] IT Instructor    [  ] Tourism Guide    [  ] Other: __________________"

# Insert IT Instructor and Tourism Guide after IT Professional if missing
for i, p in enumerate(doc.paragraphs):
    if p.text.strip() == "[  ] IT Professional":
        nxt = doc.paragraphs[i + 1].text.strip() if i + 1 < len(doc.paragraphs) else ""
        if nxt != "[  ] IT Instructor":
            insert_paragraph_after(p, "[  ] IT Instructor")
        break
for i, p in enumerate(doc.paragraphs):
    if p.text.strip() == "[  ] Tourism Office Representative":
        nxt = doc.paragraphs[i + 1].text.strip() if i + 1 < len(doc.paragraphs) else ""
        if nxt != "[  ] Tourism Guide":
            insert_paragraph_after(p, "[  ] Tourism Guide")
        break

in_kate = False
for p in doc.paragraphs:
    t = p.text.strip()
    if t in ("KATE ANGEL MAGO ESCOBAR", "Kate Angel Mago Escobar", "Kate Angel Escobar"):
        in_kate = True
        p.text = "Kate Angel Escobar"
        continue
    if in_kate and t.startswith("JASPER"):
        in_kate = False
        break
    if not in_kate:
        continue
    if t == "Tertiary: [Degree program], [School name], [Year] – Present":
        p.text = (
            "Tertiary (College): Bachelor of Science in Information Technology, "
            "Our Lady of Lourdes College Foundation — Present"
        )
    elif t == "Secondary: [School name], [Year graduated]":
        p.text = "Senior High School: Daguit National High School"
    elif t == "Primary: [School name], [Year graduated]":
        p.text = "Junior High School: Daguit National High School"
    elif t == "[e.g., web development, database design, technical writing]":
        p.text = (
            "Basic HTML and CSS; web and UI work; AI-assisted research, documentation, and prototyping; "
            "technical writing and capstone documentation."
        )

for p in doc.paragraphs:
    if p.text.strip() == "Junior High School: Daguit National High School":
        insert_paragraph_after(p, "Elementary: Canumay West Elementary School")
        break

doc.save(src)
updated_copy = r"C:\Users\kate angel\Downloads\FINALS CHAPTERS\edited chaps\Appendices_and_CV_UPDATED.docx"
shutil.copy2(src, updated_copy)
print("Updated:", src)
print("Copied to:", updated_copy)
print("URLs added:", urls_added)