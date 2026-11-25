"""Rebuild Appendix A from C:\\Users\\kate angel\\Downloads\\letters for capstone.docx."""
from docx import Document
from docx.oxml import OxmlElement
from docx.text.paragraph import Paragraph
import shutil
import zipfile
import xml.etree.ElementTree as ET

SRC = r"C:\Users\kate angel\Downloads\Appendices_and_CV.docx"
LETTERS = r"C:\Users\kate angel\Downloads\letters for capstone.docx"
UPDATED = r"C:\Users\kate angel\Downloads\FINALS CHAPTERS\edited chaps\Appendices_and_CV_UPDATED.docx"


def read_paragraphs(path):
    z = zipfile.ZipFile(path)
    ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    paras = []
    for p in ET.fromstring(z.read("word/document.xml")).iter(ns + "p"):
        line = "".join(t.text or "" for t in p.iter(ns + "t")).strip()
        if line:
            paras.append(line)
    return paras


def insert_after(paragraph, text):
    new_p = OxmlElement("w:p")
    paragraph._p.addnext(new_p)
    new_para = Paragraph(new_p, paragraph._parent)
    new_para.add_run(text)
    return new_para


def survey_intro_letter_lines(paras):
    """Paragraphs 0–11: Letter of Introduction to Survey Respondents."""
    block = paras[0:12]
    pretty = []
    for line in block:
        if line.startswith("OUR LADY OF LOURDES COLLEGE FOUNDATION") and "Vinzons" in line:
            pretty.append("Our Lady of Lourdes College Foundation")
            pretty.append("Vinzons Avenue, Daet, Camarines Norte")
            continue
        if line == "The ResearchersFourth-Year BS in Information Technology StudentsOur Lady of Lourdes College Foundation":
            pretty.extend(
                [
                    "The Researchers",
                    "Fourth-Year BS in Information Technology Students",
                    "Our Lady of Lourdes College Foundation",
                ]
            )
            continue
        if line == "Dr. Gerry LopezCapstone Adviser":
            pretty.extend(["Dr. Gerry P. Lopez", "Capstone Adviser"])
            continue
        pretty.append(line)
    return pretty


letter_paras = read_paragraphs(LETTERS)
survey_letter = survey_intro_letter_lines(letter_paras)

INTRO = (
    "This appendix presents the communication letters used in the study. Letter text for the "
    "preliminary public survey is taken from letters for capstone.docx. Insert scanned signed copies "
    "on separate pages where your format requires originals."
)

APPENDIX_A_BODY = [
    INTRO,
    "",
    "A-1. Letter of Introduction to Survey Respondents",
    "(Source: letters for capstone.docx)",
    "",
    *survey_letter,
    "",
    "[Insert scanned signed copy of this letter here, if required.]",
    "",
    "A-2. Letter to the Daet Municipal Tourism Office requesting permission to conduct the study and to name the office as the intended user of the system",
    "[Insert scanned signed copy here. This letter is not in letters for capstone.docx; use your signed Tourism Office letter.]",
    "",
    "A-3. Letters of request or invitation to the eight (8) system evaluators",
    "[Insert one scanned signed letter per evaluator.]",
    "",
    "A-4. Letter of request to the English critic / editor",
    "[Insert scanned signed copy here.]",
    "",
    "A-5. Letter of request to the statistician",
    "[Insert scanned signed copy here.]",
    "",
    "A-6. Reply or endorsement letters received from the Daet Municipal Tourism Office",
    "[Insert scanned copy or endorsement letter here.]",
]

doc = Document(SRC)
anchor = None
to_remove = []

for p in doc.paragraphs:
    t = p.text.strip()
    if t == "COMMUNICATION LETTERS":
        anchor = p
        continue
    if anchor is not None and to_remove is not None:
        if t == "APPENDIX B":
            to_remove = to_remove  # stop flag
            break
        to_remove.append(p)

if anchor is None:
    raise SystemExit("COMMUNICATION LETTERS not found")

for p in to_remove:
    p._element.getparent().remove(p._element)

prev = anchor
for line in APPENDIX_A_BODY:
    if line == "":
        prev = insert_after(prev, "")
    else:
        prev = insert_after(prev, line)

doc.save(SRC)
shutil.copy2(SRC, UPDATED)
print("Rebuilt Appendix A from", LETTERS)