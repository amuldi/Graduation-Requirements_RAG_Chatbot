#!/usr/bin/env python3
"""지식베이스(knowledge/*.md + docs/*.pdf)와 src/ 를 합쳐 단일 파일 index.html 을 만든다.

    python3 build.py

- knowledge/*.md : 손으로 정리한 chunk (학과·학번 메타데이터 포함, 정확도가 가장 높음)
- docs/*.pdf     : 추가 안내 문서. 페이지 단위로 자동 추출되어 검색 대상에 들어감 (poppler 의 pdftotext 필요)
- docs/*.txt|md  : 그대로 chunk 로 들어감
결과물 index.html 은 외부 서버 없이 더블클릭/정적 호스팅만으로 동작한다.
"""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
# 이미 knowledge/*.md 로 정리한 PDF 는 원문을 또 넣지 않는다 (표가 깨져 추출되기 때문)
CURATED_PDF_PREFIXES = ("2026년도 학과기준",)
SOURCE_LABEL = "2026년도 학과기준 디자인 시안(1차 시안-SW융합대학).pdf"


def parse_knowledge(path: Path):
    chunks = []
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    for block in re.split(r"^## ", text, flags=re.M)[1:]:
        title, _, rest = block.partition("\n")
        meta, body = {}, []
        for line in rest.splitlines():
            m = re.match(r"^- (dept|years|page|source):\s*(.+)$", line)
            if m and not body:
                meta[m.group(1)] = m.group(2).strip()
            elif line.strip() or body:
                body.append(line)
        years = None
        if "years" in meta:
            a, b = meta["years"].split("-")
            years = [int(a), int(b)]
        chunks.append({
            "title": title.strip(),
            "text": "\n".join(body).strip(),
            "dept": meta.get("dept"),
            "years": years,
            "page": int(meta["page"]) if "page" in meta else None,
            "source": meta.get("source", SOURCE_LABEL),
        })
    return chunks


def split_text(text: str, name: str, page=None):
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    out, buf = [], ""
    for p in paras:
        if len(buf) + len(p) > 700 and buf:
            out.append(buf)
            buf = ""
        buf += ("\n" if buf else "") + p
    if buf:
        out.append(buf)
    return [
        {"title": f"{name}{f' p.{page}' if page else ''} ({i + 1})", "text": t, "dept": None,
         "years": None, "page": page, "source": name}
        for i, t in enumerate(out)
    ]


def extract_pdf(path: Path):
    if not shutil.which("pdftotext"):
        print(f"  ! pdftotext 가 없어 {path.name} 을 건너뜁니다 (brew install poppler)", file=sys.stderr)
        return []
    out = subprocess.run(["pdftotext", "-layout", "-enc", "UTF-8", str(path), "-"],
                         capture_output=True, text=True, encoding="utf-8", check=True).stdout
    chunks = []
    for n, page in enumerate(out.split("\f"), start=1):
        page = re.sub(r"[ \t]{2,}", " ", page).strip()
        if page:
            chunks += split_text(page, path.stem, n)
    return chunks


def export_rules():
    """졸업 판정 규칙(src/checker.js)을 노트북용 JSON 으로 내보낸다 (node 가 있을 때만)."""
    if shutil.which("node"):
        subprocess.run(["node", str(ROOT / "tools" / "export_rules.js")], check=True)
    else:
        print("  ! node 가 없어 data/checker_rules.json 갱신을 건너뜁니다", file=sys.stderr)


def main():
    export_rules()
    chunks = []
    for md in sorted((ROOT / "knowledge").glob("*.md")):
        got = parse_knowledge(md)
        print(f"  knowledge/{md.name}: {len(got)} chunks")
        chunks += got
    for f in sorted((ROOT / "docs").glob("*")):
        if f.suffix.lower() == ".pdf":
            if f.name.startswith(CURATED_PDF_PREFIXES):
                print(f"  docs/{f.name}: knowledge/ 에 정리본이 있어 건너뜀")
                continue
            got = extract_pdf(f)
        elif f.suffix.lower() in (".txt", ".md"):
            got = split_text(f.read_text(encoding="utf-8"), f.stem)
        else:
            continue
        print(f"  docs/{f.name}: {len(got)} chunks")
        chunks += got

    src = ROOT / "src"
    html = (src / "template.html").read_text(encoding="utf-8")
    parts = {
        "{{CSS}}": (src / "style.css").read_text(encoding="utf-8"),
        "{{ENGINE}}": (src / "engine.js").read_text(encoding="utf-8"),
        "{{CHECKER}}": (src / "checker.js").read_text(encoding="utf-8"),
        "{{APP}}": (src / "app.js").read_text(encoding="utf-8"),
        "{{KB}}": json.dumps(chunks, ensure_ascii=False).replace("</", "<\\/"),
    }
    for key, val in parts.items():
        html = html.replace(key, val)
    (ROOT / "index.html").write_text(html, encoding="utf-8")
    print(f"완료: index.html ({len(html) // 1024} KB, chunk {len(chunks)}개)")


if __name__ == "__main__":
    main()
