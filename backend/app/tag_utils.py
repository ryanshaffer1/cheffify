def normalize_tags(tags: list[str]) -> list[str]:
    normalized_tags: list[str] = []
    seen: set[str] = set()

    for tag in tags:
        normalized = " ".join(tag.split()).title()
        key = normalized.casefold()
        if normalized and key not in seen:
            seen.add(key)
            normalized_tags.append(normalized)

    return normalized_tags
