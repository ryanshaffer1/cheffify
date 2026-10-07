from __future__ import annotations

import re
from pathlib import Path

from PIL import Image
import pytesseract
from pypdf import PdfReader


def normalize_ocr_text(raw_text: str) -> str:
    text = raw_text.replace("\r", "")
    text = text.replace("\u00a0", " ")

    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def merge_text_with_overlap(texts: list[str]) -> str:
    merged_lines: list[str] = []
    for text in texts:
        lines = normalize_ocr_text(text).splitlines()
        while lines and not lines[0].strip():
            lines.pop(0)
        while merged_lines and not merged_lines[-1].strip():
            merged_lines.pop()

        if merged_lines and lines:
            previous_step = next(
                (
                    match
                    for line in reversed(merged_lines)
                    if (match := re.match(r"^\s*(\d+)[.)]?\s+(.+?)\s*$", line))
                    and match.group(2).split()[0].lower().rstrip(".,;:")
                    not in COMMON_UNITS
                ),
                None,
            )
            current_step = re.match(r"^\s*(\d+)[.)]?\s+(.+?)\s*$", lines[0])
            if (
                previous_step
                and current_step
                and previous_step.group(1) == current_step.group(1)
                and re.sub(r"\s+", " ", previous_step.group(2)).casefold()
                == re.sub(r"\s+", " ", current_step.group(2)).casefold()
            ):
                lines.pop(0)
                while lines and not lines[0].strip():
                    lines.pop(0)

        overlap = 0
        max_overlap = min(len(merged_lines), len(lines))
        for size in range(max_overlap, 0, -1):
            left = [
                re.sub(r"\s+", " ", line).casefold() for line in merged_lines[-size:]
            ]
            right = [re.sub(r"\s+", " ", line).casefold() for line in lines[:size]]
            if left == right:
                overlap = size
                break
        merged_lines.extend(lines[overlap:])
    return normalize_ocr_text("\n".join(merged_lines))


def extract_text_from_txt_file(txt_path: Path) -> str:
    with open(txt_path, "r", encoding="utf-8") as file:
        text = file.read()
    return normalize_ocr_text(text)


def extract_text_from_pdf_file(pdf_path: Path) -> str:
    reader = PdfReader(pdf_path)
    full_text = []

    for page in reader.pages:
        text = page.extract_text()
        if text:
            full_text.append(text)

    all_text = "\n".join(full_text)
    text = normalize_ocr_text(all_text).translate(
        str.maketrans(
            {
                "ﬁ": "fi",
                "ﬂ": "fl",
                "⒛": "⅛",
            }
        )
    )
    lines = text.splitlines()

    metadata_line = next(
        (
            index
            for index, line in enumerate(lines)
            if re.match(r"^\d+\s+minutes?\s*\|\s*\d+\s+servings?\b", line, re.I)
        ),
        None,
    )
    if metadata_line is not None and metadata_line >= 2:
        lines[metadata_line - 2] = (
            f"{lines[metadata_line - 2]} {lines[metadata_line - 1]}"
        )
        del lines[metadata_line - 1]

    in_instructions = False
    for index, line in enumerate(lines):
        if re.match(r"^instructions?\b", line, re.I):
            in_instructions = True
            continue
        if in_instructions and re.match(
            r"^(?:cookware|tools|equipment|nutrition|ingredients?)\b", line, re.I
        ):
            in_instructions = False
        if in_instructions:
            lines[index] = re.sub(r"^(\d{1,2})(?=[A-Z])", r"\1. ", line)

    return normalize_ocr_text("\n".join(lines))


def extract_text_from_image_file(file_path: str | Path) -> str:
    image_path = Path(file_path)
    image = Image.open(image_path).convert("RGB")
    words = pytesseract.image_to_data(
        image, config="--oem 3 --psm 11", output_type=pytesseract.Output.DICT
    )

    headings: dict[str, list[tuple[int, int, int, int]]] = {
        "ingredients": [],
        "cookware": [],
        "instructions": [],
    }
    for index, raw_word in enumerate(words["text"]):
        word = raw_word.strip().lower().rstrip(":")
        if word in headings:
            headings[word].append(
                (
                    words["left"][index],
                    words["top"][index],
                    words["width"][index],
                    words["height"][index],
                )
            )

    text_parts: list[str] = []
    if headings["ingredients"] and headings["cookware"] and headings["instructions"]:
        ingredient_heading = headings["ingredients"][0]
        cookware_heading = headings["cookware"][0]
        instructions_heading = headings["instructions"][0]
        header_bottom = min(ingredient_heading[1], cookware_heading[1])
        instruction_top = instructions_heading[1]
        split_x = cookware_heading[0] - 16
        scale = 2

        regions = [
            ("header", (0, 0, image.width, header_bottom)),
            ("ingredients", (0, header_bottom, split_x, instruction_top)),
            ("cookware", (split_x, header_bottom, image.width, instruction_top)),
            ("instructions", (0, instruction_top, image.width, image.height)),
        ]
        for name, box in regions:
            crop = image.crop(box)
            if name != "header":
                crop = crop.resize(
                    (crop.width * scale, crop.height * scale), Image.Resampling.LANCZOS
                )
            page_segmentation = 11 if name in {"ingredients", "cookware"} else 6
            config = f"--oem 3 --psm {page_segmentation}"
            text_parts.append(pytesseract.image_to_string(crop, config=config))
    else:
        text_parts.append(pytesseract.image_to_string(image, config="--oem 3 --psm 6"))

    text = "\n".join(text_parts).translate(
        str.maketrans(
            {
                "©": "",
                "¢": "",
                "«": "",
            }
        )
    )
    text = re.sub(r"(?m)^\s*(?:Ye|Y|¥2|¥%)\s+(?=(?:cup|small bunch)\b)", "½ ", text)
    text = re.sub(r"(?m)^\s*Y%\s+(?=cup\b)", "¼ ", text)
    text = re.sub(r"(?i)(?<=\d )Ib\b", "lb", text)
    text = re.sub(r"(?m)^% cup\b", "¼ cup", text)
    text = re.sub(r"(?m)^1 % tsp\b", "½ tsp", text)
    text = re.sub(r"(?i)\b42-inch\b", "½-inch", text)
    text = re.sub(r"(?i)%4-inch\b", "¼-inch", text)
    text = re.sub(r"(?m)^NES\s*$", "", text)
    text = re.sub(r"(?i)\bbow\|", "bowl", text)
    return normalize_ocr_text(text)


def extract_text_from_file(file_path: str | Path) -> str:
    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    if file_path.suffix.lower() in [".png", ".jpg", ".jpeg", ".bmp", ".tiff"]:
        return extract_text_from_image_file(file_path)
    elif file_path.suffix.lower() == ".pdf":
        return extract_text_from_pdf_file(file_path)
    elif file_path.suffix.lower() == ".txt":
        return extract_text_from_txt_file(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_path.suffix}")


UNICODE_FRACTIONS = {
    "¼": 0.25,
    "½": 0.5,
    "¾": 0.75,
    "⅐": 1 / 7,
    "⅑": 1 / 9,
    "⅓": 1 / 3,
    "⅔": 2 / 3,
    "⅕": 0.2,
    "⅖": 0.4,
    "⅗": 0.6,
    "⅘": 0.8,
    "⅙": 1 / 6,
    "⅚": 5 / 6,
    "⅛": 0.125,
    "⅜": 0.375,
    "⅝": 0.625,
    "⅞": 0.875,
}

COMMON_UNITS = {
    "cup",
    "cups",
    "tablespoon",
    "tablespoons",
    "tbsp",
    "teaspoon",
    "teaspoons",
    "tsp",
    "ounce",
    "ounces",
    "oz",
    "pound",
    "pounds",
    "lb",
    "lbs",
    "gram",
    "grams",
    "g",
    "liter",
    "liters",
    "l",
    "milliliter",
    "milliliters",
    "ml",
    "whole",
    "piece",
    "pieces",
    "slice",
    "slices",
    "clove",
    "cloves",
    "head",
    "heads",
    "can",
    "cans",
    "bunch",
    "bunches",
    "sprig",
    "sprigs",
}

UNIT_ALIASES = {
    "cup": "cup",
    "cups": "cup",
    "tablespoon": "tablespoon",
    "tablespoons": "tablespoon",
    "tbsp": "tbsp",
    "teaspoon": "teaspoon",
    "teaspoons": "teaspoon",
    "tsp": "tsp",
    "ounce": "oz",
    "ounces": "oz",
    "oz": "oz",
    "pound": "lb",
    "pounds": "lb",
    "lb": "lb",
    "lbs": "lb",
    "gram": "g",
    "grams": "g",
    "g": "g",
    "liter": "l",
    "liters": "l",
    "l": "l",
    "milliliter": "ml",
    "milliliters": "ml",
    "ml": "ml",
    "whole": "whole",
    "piece": "piece",
    "pieces": "piece",
    "slice": "slice",
    "slices": "slice",
    "clove": "clove",
    "cloves": "clove",
    "head": "head",
    "heads": "head",
    "can": "can",
    "cans": "can",
    "bunch": "bunch",
    "bunches": "bunch",
    "sprig": "sprig",
    "sprigs": "sprig",
}

SECTION_NAMES = {
    "ingredients": ("ingredients", "ingredient list"),
    "instructions": ("instructions", "instruction", "method", "steps"),
    "tools": ("cookware", "tools", "equipment"),
}

NUTRITION_NAMES = {
    "calories": "calories",
    "calorie": "calories",
    "protein": "protein_g",
    "protein_g": "protein_g",
    "carbs": "carbs_g",
    "carbohydrates": "carbs_g",
    "fat": "fat_g",
    "fiber": "fiber_g",
}


def _clean_line(line: str) -> str:
    return re.sub(r"^[\s\-\*•]+", "", line).strip(" .,:;\t")


def _clean_instruction(line: str) -> str:
    return re.sub(r"^\s*[-*•]+\s*", "", line).strip()


def _split_instructions(
    lines: list[str], ingredient_names: set[str] | None = None
) -> list[str]:
    numbered_line = re.compile(r"^\s*(\d+)([.)])?\s+(.+?)\s*$")
    parsed_lines = [numbered_line.match(line) for line in lines]
    punctuated_indexes = {
        index for index, match in enumerate(parsed_lines) if match and match.group(2)
    }
    bare_numbers = [
        (index, int(match.group(1)))
        for index, match in enumerate(parsed_lines)
        if (
            match
            and not match.group(2)
            and not punctuated_indexes
            and match.group(3).split()[0].lower().rstrip(".,;:")
            not in COMMON_UNITS | {"pint", "pints", "quart", "quarts"}
            and _parse_ingredient(lines[index])["normalized_name"]
            not in (ingredient_names or set())
        )
    ]
    bare_sequence_indexes: set[int] = set()
    expected_number = 1
    for index, number in bare_numbers:
        if number == expected_number:
            bare_sequence_indexes.add(index)
            expected_number += 1
        elif number == expected_number - 1:
            continue

    numbered_indexes = {
        index
        for index, match in enumerate(parsed_lines)
        if match
        and (
            index in punctuated_indexes
            or (
                index in bare_sequence_indexes
                and match.group(3).split()[0].lower().rstrip(".,;:") not in COMMON_UNITS
            )
        )
    }
    numbered_steps: list[str] = []

    if numbered_indexes:
        for index, line in enumerate(lines):
            match = parsed_lines[index]
            if index in numbered_indexes and match:
                numbered_steps.append(match.group(3))
            elif numbered_steps:
                continuation = line.strip()
                ingredient_match = re.fullmatch(r"1\s+(.+)", continuation)
                if (
                    ingredient_match
                    and ingredient_names
                    and _parse_ingredient(continuation)["normalized_name"]
                    in ingredient_names
                    and ingredient_match.group(1).split()[0].lower()
                    not in COMMON_UNITS | {"pint", "pints", "quart", "quarts"}
                ):
                    continuation = ingredient_match.group(1)
                numbered_steps[-1] = f"{numbered_steps[-1]} {continuation}"
            else:
                numbered_steps.append(line.strip())
        return numbered_steps

    return [line.strip() for line in lines if line.strip()]


def _normalize_fraction(value: str) -> str:
    return str(UNICODE_FRACTIONS.get(value, value))


def _parse_quantity(value: str) -> float | None:
    normalized = _normalize_fraction(value.strip())
    if normalized in UNICODE_FRACTIONS.values():
        return float(normalized)

    mixed = re.fullmatch(r"(\d+)\s+(\d+)\/(\d+)", normalized)
    if mixed:
        whole, numerator, denominator = map(int, mixed.groups())
        if denominator:
            return whole + numerator / denominator

    fraction = re.fullmatch(r"(\d+)\/(\d+)", normalized)
    if fraction:
        numerator, denominator = map(int, fraction.groups())
        if denominator:
            return numerator / denominator

    if re.fullmatch(r"\d+(?:\.\d+)?", normalized):
        return float(normalized)

    return None


def _parse_ingredient(raw: str) -> dict[str, object]:
    cleaned = _clean_line(raw)
    tokens = cleaned.split()
    quantity_tokens: list[str] = []
    index = 0

    while index < len(tokens):
        token = _normalize_fraction(tokens[index])
        if not re.fullmatch(r"\d+(?:\.\d+)?(?:\/\d+)?", token) and not re.fullmatch(
            r"\d+\s+\d+\/\d+", token
        ):
            break
        quantity_tokens.append(token)
        index += 1

    remainder = " ".join(tokens[index:]).strip()
    quantity = _parse_quantity(" ".join(quantity_tokens)) if quantity_tokens else None
    if quantity is None:
        quantity = 1.0

    unit = ""
    name = remainder
    if remainder:
        first_token = remainder.split()[0].lower().rstrip(".,;:")
        if first_token in COMMON_UNITS:
            unit = UNIT_ALIASES[first_token]
            name = " ".join(remainder.split()[1:])

    name = name.strip(" .,:;")
    normalized_name = re.sub(r"\s+", " ", name).lower()
    return {
        "display_name": normalized_name,
        "normalized_name": normalized_name,
        "quantity": quantity,
        "unit": unit,
    }


def _extract_section(lines: list[str], names: tuple[str, ...]) -> list[str]:
    pattern = re.compile(
        rf"^(?:#+\s*)?(?:{'|'.join(re.escape(name) for name in names)})\b",
        re.IGNORECASE,
    )
    section_indexes = [
        index for index, line in enumerate(lines) if pattern.match(line.strip())
    ]
    if not section_indexes:
        return []

    start = section_indexes[0]
    end = next(
        (
            index
            for index in range(start + 1, len(lines))
            if pattern.match(lines[index].strip())
            or re.match(
                r"^(?:#+\s*)?(?:ingredients?|instructions?|method|steps?|cookware|tools?|equipment|nutrition|notes?|serves?|yield|makes?)\b",
                lines[index].strip(),
                re.IGNORECASE,
            )
        ),
        len(lines),
    )
    return [line for line in lines[start + 1 : end] if line.strip()]


def _extract_sections(lines: list[str]) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {name: [] for name in SECTION_NAMES}
    for section_name, names in SECTION_NAMES.items():
        sections[section_name] = _extract_section(lines, names)
    return sections


def _parse_nutrition(text: str) -> dict[str, float | None | str]:
    values: dict[str, float | None | str] = {
        "calories": None,
        "protein_g": None,
        "carbs_g": None,
        "fat_g": None,
        "fiber_g": None,
        "notes": None,
    }
    pattern = re.compile(
        r"(?im)^\s*(calorie|calories|protein|protein_g|carb|carbs|carbs_g|carbohydrates|fat|fat_g|fiber|fiber_g)\s*[:\-]\s*(\d+(?:\.\d+)?(?:[^\S\r\n]*[a-z%]+)?)"
    )
    for match in pattern.finditer(text):
        label = NUTRITION_NAMES[match.group(1).lower()]
        numeric = re.search(r"\d+(?:\.\d+)?", match.group(2))
        if numeric:
            values[label] = float(numeric.group())
    return values


def parse_recipe(extracted_text: str) -> dict[str, object]:
    normalized = extracted_text.replace("\r", "").strip()
    lines = [line.strip() for line in normalized.splitlines() if line.strip()]

    explicit_title = next(
        (
            line
            for line in lines
            if re.match(r"^(?:title|recipe)\s*[:\-]", line, re.IGNORECASE)
        ),
        None,
    )
    title = explicit_title or next(
        (
            line
            for line in lines
            if not re.match(r"^(?:[-*•]\s*|\d+[.)]\s+|#)", line)
            and not re.match(
                r"^(?:ingredients?|instructions?|method|steps?|cookware|tools?|equipment|nutrition|notes?|serves?|yield|makes?)\b",
                line,
                re.IGNORECASE,
            )
            and len(line.split()) <= 12
            and len(line) <= 90
        ),
        "",
    )
    title = re.sub(
        r"^(?:title|recipe)\s*[:\-]\s*", "", title, flags=re.IGNORECASE
    ).strip("# ")

    keyword_match = re.search(
        r"(?:tags?|keywords?)\s*[:\-]\s*([^\n]+)", normalized, re.IGNORECASE
    )
    keywords = (
        [
            item.strip(" #-")
            for item in re.split(r"[,]+", keyword_match.group(1))
            if item.strip()
        ]
        if keyword_match
        else [match.group(1) for match in re.finditer(r"#([A-Za-z0-9_-]+)", normalized)]
    )

    servings_match = re.search(
        r"(?:serves?|yield|makes?)\s*[:\-]\s*(\d+)", normalized, re.IGNORECASE
    )
    default_servings = int(servings_match.group(1)) if servings_match else 2

    sections = _extract_sections(lines)
    ingredients = [
        _parse_ingredient(line)
        for line in sections["ingredients"]
        if line
        and not re.match(r"^(?:ingredients?|ingredient list)\b", line, re.IGNORECASE)
    ]
    ingredient_names = {
        str(ingredient["normalized_name"]) for ingredient in ingredients
    }
    instructions = [
        {
            "step_number": index,
            "instruction": re.sub(r"^\d+[.)]\s*", "", _clean_instruction(line)),
        }
        for index, line in enumerate(
            _split_instructions(sections["instructions"], ingredient_names),
            start=1,
        )
        if _clean_instruction(line)
    ]
    tools = [_clean_line(line) for line in sections["tools"] if _clean_line(line)]

    return {
        "title": title,
        "keywords": keywords,
        "ingredients": ingredients,
        "instructions": instructions,
        "tools": tools,
        "default_servings": default_servings,
        "min_servings": 1,
        "max_servings": default_servings,
        "nutrition": _parse_nutrition(normalized),
    }


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python ocr.py <image_file>")
        sys.exit(1)

    file = sys.argv[1]
    extracted_text = extract_text_from_file(file)
    print(extracted_text)
