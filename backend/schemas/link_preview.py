from pydantic import BaseModel


class LinkPreview(BaseModel):
    """OpenGraph-метаданные ссылки: title + description + image + url."""

    url: str
    title: str
    description: str
    image: str
    site_name: str
    favicon: str
