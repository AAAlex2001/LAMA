from typing import Optional
import html as html_module
import logging
import re

logger = logging.getLogger(__name__)


def clean_html_for_telegram(text: Optional[str]) -> Optional[str]:
    """Normalize HTML to a Telegram-safe subset and preserve supported tags."""
    if not text:
        return text

    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</(p|div)>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<(p|div)[^>]*>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<span[^>]*>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"</span>", "", text, flags=re.IGNORECASE)
    text = re.sub(
        r"<(b|i|u|s|strong|em|strike|del|tg-spoiler|blockquote)\s+style=\"[^\"]*\"",
        r"<\1",
        text,
        flags=re.IGNORECASE,
    )

    code_placeholders = []

    def stash_code(match):
        raw = match.group(1)
        unescaped = html_module.unescape(raw)
        escaped = html_module.escape(unescaped, quote=False)
        code_placeholders.append(f"<pre><code>{escaped}</code></pre>")
        return f"__TG_CODE_{len(code_placeholders) - 1}__"

    text = re.sub(
        r"<pre[^>]*>\s*<code[^>]*>([\s\S]*?)</code>\s*</pre>",
        stash_code,
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(
        r"<code[^>]*>([\s\S]*?)</code>",
        stash_code,
        text,
        flags=re.IGNORECASE,
    )

    supported_pattern = r"</?(?:b|strong|i|em|u|s|strike|del|a(?:\s+href=\"[^\"]*\")?|tg-spoiler|blockquote|pre|code)\b[^>]*>"
    placeholders = []

    def stash_tag(match):
        placeholders.append(match.group(0))
        return f"__TG_TAG_{len(placeholders) - 1}__"

    text = re.sub(supported_pattern, stash_tag, text, flags=re.IGNORECASE)
    text = html_module.escape(text, quote=False)

    for i, tag in enumerate(placeholders):
        text = text.replace(f"__TG_TAG_{i}__", tag)
    for i, block in enumerate(code_placeholders):
        text = text.replace(f"__TG_CODE_{i}__", block)

    allowed_tags = {
        "b", "strong", "i", "em", "u", "s", "strike", "del",
        "a", "tg-spoiler", "blockquote", "pre", "code",
    }
    tag_re = re.compile(r"</?([a-z0-9-]+)(?:\s[^>]*)?>", re.IGNORECASE)
    result = []
    stack = []
    last = 0

    for match in tag_re.finditer(text):
        result.append(text[last:match.start()])
        tag = match.group(1).lower()
        is_close = match.group(0).startswith("</")

        if tag not in allowed_tags:
            last = match.end()
            continue

        if is_close:
            if stack and stack[-1] == tag:
                result.append(match.group(0))
                stack.pop()
        else:
            result.append(match.group(0))
            stack.append(tag)

        last = match.end()

    result.append(text[last:])
    while stack:
        result.append(f"</{stack.pop()}>")
    text = "".join(result)

    text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)
    text = text.strip()

    logger.info("Clean HTML result (first 500 chars): %s", text[:500])
    return text
