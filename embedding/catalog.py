"""Texts to embed for the catalog: innovations, challenge areas and challenges.

Each innovation becomes several chunks (full description, problem, summary, each audience,
keywords, and plain-language problem statements from data/derived/plain_queries.json). Search
scores an innovation by its best chunk: a short query about one aspect ("loneliness") hits the
chunk about that aspect instead of getting lost in an averaged description. On the accuracy evals
this setup reached 94% top-1 / 100% top-3 on the ROPS keyword set with mmlw-e5-base.

przyklady_zapytan is never embedded: those are exactly the sentences of the accuracy test.
"""

import json
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PLAIN_QUERIES = ROOT / "data" / "derived" / "plain_queries.json"


@dataclass(frozen=True)
class Chunk:
    kind: str  # "innovation" | "area" | "challenge"
    ref_id: str
    chunk: int  # position within the item
    chunk_type: str  # full | problem | summary | audience | keywords | plain | area | challenge
    content: str


def load_plain_queries(path: Path = PLAIN_QUERIES) -> dict[str, list[str]]:
    return json.loads(path.read_text())["queries"] if path.exists() else {}


def is_for_matchmaking(item: dict, outside_library: bool) -> bool:
    """Same rule as P1's seed (scripts/seed/build_seed.ts): Library items always; items from
    outside the Library only with a complete description, unless the file says otherwise."""
    if not outside_library:
        return item.get("do_matchmakingu", True)
    return item.get("do_matchmakingu", item.get("pewnosc") == "pewne")


def innovation_chunks(item: dict, plain: list[str] | None = None) -> list[Chunk]:
    name = item["nazwa"]
    audience = item.get("dla_kogo") or []
    keywords = item.get("slowa_kluczowe") or []
    full = [
        name,
        item.get("opis_krotki"),
        item.get("problem"),
        f"Dla kogo: {'; '.join(audience)}" if audience else None,
        f"Słowa kluczowe: {', '.join(keywords)}" if keywords else None,
    ]
    texts = [("full", ". ".join(x for x in full if x))]
    if item.get("problem"):
        texts.append(("problem", f"{name}. Problem: {item['problem']}"))
    if item.get("opis_krotki"):
        texts.append(("summary", f"{name}: {item['opis_krotki']}"))
    texts += [("audience", f"{name} – dla: {who}") for who in audience]
    if keywords:
        texts.append(("keywords", f"{name}: {', '.join(keywords)}"))
    texts += [("plain", q) for q in plain or []]
    return [Chunk("innovation", item["id"], n, t, c) for n, (t, c) in enumerate(texts)]


def area_chunks(area: dict) -> list[Chunk]:
    text = ". ".join(
        x
        for x in [
            area["nazwa"],
            area.get("definicja"),
            f"Słowa kluczowe: {', '.join(area['slowa_kluczowe'])}" if area.get("slowa_kluczowe") else None,
        ]
        if x
    )
    chunks = [Chunk("area", area["id"], 0, "area", text)]
    for n, challenge in enumerate(area.get("kluczowe_wyzwania") or []):
        chunks.append(Chunk("challenge", challenge["id"], 0, "challenge", f"{area['nazwa']}: {challenge['tekst']}"))
    return chunks


def catalog_chunks(data_dir: Path = ROOT / "data" / "rops") -> list[Chunk]:
    """All chunks from the data/rops files (the same source P1's seed uses)."""
    plain = load_plain_queries()
    library = json.loads((data_dir / "biblioteka.json").read_text())["innowacje"]
    outside = json.loads((data_dir / "biblioteka_spoza.json").read_text())["innowacje"]
    items = [i for i in library if is_for_matchmaking(i, False)] + [
        i for i in outside if is_for_matchmaking(i, True)
    ]
    chunks = [c for item in items for c in innovation_chunks(item, plain.get(item["id"]))]
    areas = json.loads((data_dir / "mapa_wyzwan.json").read_text())["obszary"]
    return chunks + [c for area in areas for c in area_chunks(area)]
