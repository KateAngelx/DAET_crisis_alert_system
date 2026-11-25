from docx import Document
from docx.oxml import OxmlElement
from docx.text.paragraph import Paragraph
import shutil

SRC = r"C:\Users\kate angel\Downloads\Appendices_and_CV.docx"
UPDATED = r"C:\Users\kate angel\Downloads\FINALS CHAPTERS\edited chaps\Appendices_and_CV_UPDATED.docx"

MARKER = "Insert here the scanned, signed copies of the communication letters used in the study"
FALLBACK = "[  ] Letter to the Daet Municipal Tourism Office"

INTRO = (
    "This appendix lists only the communication letters required for this capstone (see checklist in the manuscript). "
    "The letter text for A-1 is taken from letters.docx. Coffee Shoppp\\Letters.docx was checked: it contains "
    "coffee shop and grocery store permission letters from a different subject project and is not part of this study."
)

BLOCK = [
    "A-1. Letter to the Daet Municipal Tourism Office",
    "",
    "Communication Letter to the Target Beneficiary",
    "10 November 2026",
    "The Head",
    "Daet Municipal Tourism Office",
    "Municipal Hall, Maharlika Highway, Pamorangon",
    "Daet, Camarines Norte",
    "Dear Sir or Madam,",
    "",
    "Greetings from the College of Computer Studies of Our Lady of Lourdes College Foundation, Vinzons Avenue, Lag-on, Daet, Camarines Norte.",
    "",
    "We respectfully request a schedule to present our capstone project to your office. The project is the DAET Tourism Crisis Communication and Emergency Alert System. On the public screen it is named CONNECT-DAET.",
    "",
    "The presentation will begin with the main function. An administrator publishes one official crisis alert. The alert appears on the public Crisis Hub. Email, text message, and in-app notification are sent only for the channels the office leaves on, and only to a person who is included in the audience and who has allowed that channel with a valid contact. We will also show a tourist incident report and the record that remains when an alert is marked resolved.",
    "",
    "We will then show the controls your office can use. The Crisis Hub map and Roads and hazards can each be turned off for visitors. When either one is off, that feature is hidden and the alert list remains. Admin and guide screens stay available. A separate setting controls whether a registered tourist can submit a request for guide assistance.",
    "",
    "CONNECT-DAET is an information service for the tourism office. A life-threatening emergency is still referred to 911 or 117.",
    "",
    "We hope you can give us a time for the presentation. Thank you.",
    "",
    "Respectfully yours,",
    "Jhunnel Carillo — Researcher, Bachelor of Science in Information Technology",
    "Kate Angel Escobar — Researcher, Bachelor of Science in Information Technology",
    "Jasper Tubale — Researcher, Bachelor of Science in Information Technology",
    "",
    "Noted by:",
    "Doc. Gerry P. Lopez",
    "Capstone Adviser, College of Computer Studies",
    "",
    "[Insert scanned signed copy of this letter on the following page, if required by your format.]",
    "",
    "A-2. Letters of request or invitation to the eight (8) system evaluators",
    "[Insert one scanned signed letter per evaluator.]",
    "",
    "A-3. Letter of request to the English critic / editor",
    "[Insert scanned signed copy here.]",
    "",
    "A-4. Letter of request to the statistician",
    "[Insert scanned signed copy here.]",
    "",
    "A-5. Reply or endorsement letters received from the Daet Municipal Tourism Office",
    "[Insert scanned copy or endorsement letter here.]",
]


def insert_before(paragraph, text):
    new_p = OxmlElement("w:p")
    paragraph._p.addprevious(new_p)
    new_para = Paragraph(new_p, paragraph._parent)
    new_para.add_run(text)
    return new_para


doc = Document(SRC)
start_para = None
to_remove = []
inside = False

for p in doc.paragraphs:
    text = p.text
    if MARKER in text or (start_para is None and FALLBACK in text):
        inside = True
        start_para = p
        p.text = INTRO
        continue
    if inside:
        if text.strip() == "APPENDIX B":
            break
        to_remove.append(p)

if start_para is None:
    raise SystemExit("Appendix A marker not found")

for p in to_remove:
    p._element.getparent().remove(p._element)

appendix_b = None
for p in doc.paragraphs:
    if p.text.strip() == "APPENDIX B":
        appendix_b = p
        break

for line in reversed(BLOCK):
    insert_before(appendix_b, line)

doc.save(SRC)
shutil.copy2(SRC, UPDATED)
print("Done:", SRC)