from pydantic import BaseModel


class LinkPreview(BaseModel):
    url: str
    title: str
    description: str
    image: str
    site_name: str
    favicon: str
