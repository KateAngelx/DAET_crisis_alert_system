from docx import Document
from docx.oxml import OxmlElement
from docx.text.paragraph import Paragraph
import shutil

PATH = r"C:\Users\kate angel\Downloads\FINALS CHAPTERS\edited chaps\Appendices_and_CV_UPDATED.docx"
DOWNLOADS = r"C:\Users\kate angel\Downloads\Appendices_and_CV.docx"

APPENDIX_G = [
    "APPENDIX G",
    "PHOTOGRAPHIC AND SCANNED DOCUMENTATION",
    "",
    (
        "This appendix contains photographs and scanned images supporting Appendix A (signed communication "
        "letters) and, if applicable, documentation of system demonstration during evaluation. Insert one image "
        "per page with a short caption. Researcher 2×2 ID photos belong on the Curriculum Vitae section, not here."
    ),
    "",
    "G-1. Scanned signed copy — A-2 Letter to the Daet Municipal Tourism Office",
    "[Insert image here]",
    "Caption: Signed permission letter to the Daet Municipal Tourism Office.",
    "",
    "G-2. Scanned signed copy — A-1 Letter of Introduction to Survey Respondents (if separately signed)",
    "[Insert image here]",
    "Caption: Signed letter of introduction to survey respondents.",
    "",
    "G-3. Scanned signed letters — A-3 Invitations to system evaluators (eight evaluators)",
    "[Insert image here — Evaluator 1]",
    "Caption: Evaluator 1 invitation letter.",
    "[Insert image here — Evaluators 2–8 on following pages as needed]",
    "",
    "G-4. Scanned signed copy — A-4 Letter to the English critic / editor",
    "[Insert image here]",
    "Caption: Request letter to the English critic or editor.",
    "",
    "G-5. Scanned signed copy — A-5 Letter to the statistician",
    "[Insert image here]",
    "Caption: Request letter to the statistician.",
    "",
    "G-6. Scanned copy — A-6 Tourism Office reply or endorsement (if received)",
    "[Insert image here]",
    "Caption: Endorsement or reply from the Daet Municipal Tourism Office.",
    "",
    "G-7. Optional — System demonstration during evaluation (November 10–11, 2026)",
    "[Insert image here]",
    "Caption: System demonstration to evaluators or users.",
    "[Insert additional demonstration photos on following pages as needed]",
]


def insert_before(paragraph, text):
    new_p = OxmlElement("w:p")
    paragraph._p.addprevious(new_p)
    new_para = Paragraph(new_p, paragraph._parent)
    if text:
        new_para.add_run(text)
    return new_para


def insert_after(paragraph, text):
    new_p = OxmlElement("w:p")
    paragraph._p.addnext(new_p)
    new_para = Paragraph(new_p, paragraph._parent)
    if text:
        new_para.add_run(text)
    return new_para


doc = Document(PATH)
cv = None
to_remove = []
capturing = False

for p in doc.paragraphs:
    t = p.text.strip()
    if t == "APPENDIX G" or t == "PHOTOGRAPHIC AND SCANNED DOCUMENTATION":
        capturing = True
    if t == "CURRICULUM VITAE":
        cv = p
        break
    if capturing:
        to_remove.append(p)

# remove stray G lines before CV (including those above APPENDIX G title)
if cv:
    for p in list(to_remove):
        if p._element.getparent() is not None:
            p._element.getparent().remove(p._element)

# also remove duplicate blocks that were inserted before CV (G-1 through intro above F.3 tail)
for p in list(doc.paragraphs):
    t = p.text.strip()
    if t.startswith("G-") and "Scanned" in t or t.startswith("[Insert image") or t == "Caption: Signed permission":
        # risky - only remove between F.3 placeholder and CV
        pass

prev = None
for p in doc.paragraphs:
    if p.text.strip() == "CURRICULUM VITAE":
        cv = p
        break

if cv is None:
    raise SystemExit("CV not found")

# Remove orphan G-section lines immediately before CV
while True:
    prev_elem = cv._p.getprevious()
    if prev_elem is None:
        break
    prev_para = Paragraph(prev_elem, cv._parent)
    t = prev_para.text.strip()
    if not t:
        prev_elem.getparent().remove(prev_elem)
        continue
    if (
        t == "APPENDIX G"
        or t == "PHOTOGRAPHIC AND SCANNED DOCUMENTATION"
        or t.startswith("G-")
        or t.startswith("[Insert image")
        or t.startswith("Caption:")
        or "photographs and scanned images supporting Appendix A" in t
        or "Insert additional demonstration" in t
    ):
        prev_elem.getparent().remove(prev_elem)
        continue
    break

prev = cv
for line in reversed(APPENDIX_G):
    insert_before(cv, line)

doc.save(PATH)
try:
    shutil.copy2(PATH, DOWNLOADS)
except PermissionError:
    pass
print("Fixed Appendix G order")