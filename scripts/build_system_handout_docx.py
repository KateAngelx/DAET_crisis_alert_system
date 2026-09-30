"""Build DAET TOURISM system handout — run from repo: python scripts/build_system_handout_docx.py"""
import importlib.util
from pathlib import Path

SRC = Path(r"C:\Users\kate angel\Downloads\handout_to_docx.py")
spec = importlib.util.spec_from_file_location("handout_to_docx", SRC)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
mod.build()
