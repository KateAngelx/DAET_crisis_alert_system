"""Insert A-2 letter, B.2 intro, Appendix G (photos), restore A-4–A-6 if missing."""
from docx import Document
from docx.oxml import OxmlElement
from docx.text.paragraph import Paragraph
import shutil

SRC = r"C:\Users\kate angel\Downloads\Appendices_and_CV.docx"
UPDATED = r"C:\Users\kate angel\Downloads\FINALS CHAPTERS\edited chaps\Appendices_and_CV_UPDATED.docx"

A2_MARKER = (
    "A-2. Letter to the Daet Municipal Tourism Office requesting permission to conduct the study "
    "and to name the office as the intended user of the system"
)

A2_BODY = [
    "",
    "THE MUNICIPAL TOURISM OFFICER",
    "Daet Municipal Tourism Office",
    "Municipality of Daet",
    "Camarines Norte",
    "",
    "Subject: Request for Permission to Conduct the Study and Identify the Office as the Intended User of the System",
    "",
    "Dear Sir/Madam:",
    "",
    "Greetings!",
    "",
    (
        'We are fourth-year Bachelor of Science in Information Technology students of Our Lady of Lourdes '
        'College Foundation, currently conducting our capstone project entitled "DAET Tourism Crisis '
        'Communication and Emergency Alert System."'
    ),
    "",
    (
        "In connection with this, we respectfully request permission to conduct our study in coordination with "
        "the Daet Municipal Tourism Office and to identify your office as the intended user of our proposed system."
    ),
    "",
    (
        "The project aims to develop a system that will support tourism-related crisis communication and emergency "
        "alert dissemination in the Municipality of Daet. It is designed to provide a platform for sharing "
        "important announcements, emergency alerts, and relevant information to help improve communication "
        "between the tourism office and tourists."
    ),
    "",
    (
        "Furthermore, we would like to request your cooperation in providing relevant information, insights, and "
        "feedback that may help us understand the existing communication processes and ensure that the developed "
        "system addresses the needs of its intended users."
    ),
    "",
    (
        "Rest assured that all information gathered will be used solely for academic and research purposes. We will "
        "also ensure that the study will be conducted with proper consideration of your office's time and "
        "responsibilities."
    ),
    "",
    (
        "We sincerely hope for your favorable response and approval of this request. Your cooperation and support "
        "will greatly contribute to the successful development and evaluation of our capstone project."
    ),
    "",
    "Thank you for your time and consideration.",
    "",
    "Respectfully yours,",
    "",
    "The Researchers",
    "Bachelor of Science in Information Technology",
    "Our Lady of Lourdes College Foundation",
    "",
    "Noted by:",
    "",
    "Dr. Gerry P. Lopez",
    "Capstone Adviser",
    "",
    "(See Appendix G, Photo G-1, for the scanned signed copy of this letter.)",
]

A_TAIL = [
    "A-4. Letter of request to the English critic / editor",
    "[Insert letter text or scanned copy; photo in Appendix G, Photo G-4.]",
    "",
    "A-5. Letter of request to the statistician",
    "[Insert letter text or scanned copy; photo in Appendix G, Photo G-5.]",
    "",
    "A-6. Reply or endorsement letters received from the Daet Municipal Tourism Office",
    "[Insert scanned copy or endorsement letter; photo in Appendix G, Photo G-6.]",
]

B2_MARKER = "B.2 System Evaluation Questionnaire (ISO/IEC 25010 Functional Suitability)"
B2_INTRO = [
    "",
    "SYSTEM EVALUATION QUESTIONNAIRE — CONNECT-DAET",
    "DAET Tourism Crisis Communication and Emergency Alert System",
    "",
    "Good day!",
    "",
    (
        "We are 4th-year Information Technology students conducting the evaluation of our capstone project entitled "
        '"DAET Tourism Crisis Communication and Emergency Alert System."'
    ),
    "",
    (
        "This questionnaire aims to evaluate the functional suitability of the developed system. It focuses on "
        "whether the system provides the necessary functions, performs them correctly, and supports its intended "
        "purpose."
    ),
    "",
    (
        "Your participation will help us determine whether the available system features meet their intended "
        "functions and identify areas that may need improvement."
    ),
    "",
    "Please explore the available features of the system before answering this questionnaire.",
    "",
    (
        "Evaluate each statement based on your actual experience. If a feature is not available for your account or "
        "you have not tested it, select N/O (Not Observed / Not Tested)."
    ),
    "",
    "Thank you for your time and participation.",
    "",
]

APPENDIX_G = [
    "APPENDIX G",
    "PHOTOGRAPHIC AND SCANNED DOCUMENTATION",
    "",
    (
        "This appendix contains photographs and scanned images supporting Appendix A (signed communication letters) "
        "and, if applicable, documentation of system demonstration during evaluation. Insert one image per page with "
        "a short caption. Researcher 2×2 ID photos belong on the Curriculum Vitae section, not in this appendix."
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


def insert_after(paragraph, text):
    new_p = OxmlElement("w:p")
    paragraph._p.addnext(new_p)
    new_para = Paragraph(new_p, paragraph._parent)
    if text:
        new_para.add_run(text)
    return new_para


def insert_before(paragraph, text):
    new_p = OxmlElement("w:p")
    paragraph._p.addprevious(new_p)
    new_para = Paragraph(new_p, paragraph._parent)
    if text:
        new_para.add_run(text)
    return new_para


def already_has_a2_body(doc):
    for p in doc.paragraphs:
        if p.text.strip().startswith("Subject: Request for Permission to Conduct the Study"):
            return True
    return False


def already_has_appendix_g(doc):
    for p in doc.paragraphs:
        if p.text.strip() == "APPENDIX G":
            return True
    return False


doc = Document(SRC)

# --- A-2 letter ---
if not already_has_a2_body(doc):
    for p in doc.paragraphs:
        if p.text.strip() == A2_MARKER:
            prev = p
            for line in A2_BODY:
                prev = insert_after(prev, line)
            break

# --- Restore A-4–A-6 if jumped from A-3 to APPENDIX B ---
for i, p in enumerate(doc.paragraphs):
    if p.text.strip() == "A-3. Letters of request or invitation to the eight (8) system evaluators":
        nxt = doc.paragraphs[i + 1].text.strip() if i + 1 < len(doc.paragraphs) else ""
        if nxt == "APPENDIX B" or nxt.startswith("[Insert one scanned"):
            if nxt.startswith("[Insert one scanned"):
                doc.paragraphs[i + 1].text = (
                    "[Insert letter text or one generic invitation; scanned copies in Appendix G, Photo G-3.]"
                )
            prev = doc.paragraphs[i + 1] if nxt.startswith("[Insert") else p
            if not any(x.text.strip().startswith("A-4.") for x in doc.paragraphs):
                for line in A_TAIL:
                    prev = insert_after(prev, line)
            elif nxt == "APPENDIX B":
                for line in reversed(A_TAIL):
                    insert_before(
                        next(x for x in doc.paragraphs if x.text.strip() == "APPENDIX B"),
                        line,
                    )
        break

# --- B.2 intro ---
has_b2_intro = any("functional suitability of the developed system" in p.text for p in doc.paragraphs)
if not has_b2_intro:
    for p in doc.paragraphs:
        if p.text.strip() == B2_MARKER:
            prev = p
            for line in B2_INTRO:
                prev = insert_after(prev, line)
            break
        if p.text.strip().startswith("Administered through Google Forms to eight (8)"):
            for line in reversed(B2_INTRO):
                insert_before(p, line)
            break

# --- Appendix G before CV ---
if not already_has_appendix_g(doc):
    cv_para = None
    for p in doc.paragraphs:
        if p.text.strip() == "CURRICULUM VITAE":
            cv_para = p
            break
    if cv_para is None:
        raise SystemExit("CURRICULUM VITAE not found")
    for line in reversed(APPENDIX_G):
        insert_before(cv_para, line)

out = UPDATED
try:
    doc.save(SRC)
    shutil.copy2(SRC, UPDATED)
    out = SRC
except PermissionError:
    doc.save(UPDATED)
    out = UPDATED
    print("Note: Close Appendices_and_CV.docx in Word to update the Downloads copy.")
print("Updated A-2, B.2 intro, Appendix G ->", out)