from pathlib import Path
from typing import Any

from html2text import html2text
from jinja2 import Environment, FileSystemLoader, select_autoescape


class EmailRenderer:
    def __init__(self):
        self.env = Environment(
            loader=FileSystemLoader(Path(__file__).parent / "templates"),
            autoescape=select_autoescape(["html"])
        )

    def render(self, template_name: str, context: dict[str, Any]):
        template = self.env.get_template(template_name)
        html_content = template.render(**context)
        text_content = html2text(html_content)

        return text_content, html_content
