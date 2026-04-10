from typing import List, Literal, Optional
from pydantic import BaseModel, field_validator


def normalize_related_slugs(value):
    if value is None:
        return value
    if not isinstance(value, list):
        return value

    normalized: List[str] = []
    for item in value:
        if isinstance(item, str):
            slug = item.strip()
        elif isinstance(item, dict):
            raw_slug = item.get("slug")
            if not isinstance(raw_slug, str):
                raise ValueError("relatedSlugs items must contain a string slug")
            slug = raw_slug.strip()
        else:
            raise ValueError("relatedSlugs items must be strings or objects with slug")

        if slug:
            normalized.append(slug)

    return normalized


# --------------- Request ---------------

class CreateKBCategoryRequest(BaseModel):
    slug: str
    title: str
    locale: str = "RU"
    order: int = 0


class UpdateKBCategoryRequest(BaseModel):
    title: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


class ArticleSectionSchema(BaseModel):
    type: str
    title: Optional[str] = None
    body: Optional[str] = None
    items: Optional[List[str]] = None
    src: Optional[str] = None
    src1: Optional[str] = None
    src2: Optional[str] = None
    alt: Optional[str] = None


class CreateKBArticleRequest(BaseModel):
    categorySlug: str
    slug: str
    title: str
    description: Optional[str] = None
    locale: str = "RU"
    readingMinutes: Optional[int] = None
    sections: Optional[List[ArticleSectionSchema]] = None
    relatedSlugs: Optional[List[str]] = None
    metaTitle: Optional[str] = None
    metaDescription: Optional[str] = None
    order: int = 0

    @field_validator("relatedSlugs", mode="before")
    @classmethod
    def validate_related_slugs(cls, value):
        return normalize_related_slugs(value)


class UpdateKBArticleRequest(BaseModel):
    categorySlug: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    readingMinutes: Optional[int] = None
    sections: Optional[List[ArticleSectionSchema]] = None
    relatedSlugs: Optional[List[str]] = None
    metaTitle: Optional[str] = None
    metaDescription: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator("relatedSlugs", mode="before")
    @classmethod
    def validate_related_slugs(cls, value):
        return normalize_related_slugs(value)


class FeedbackRequest(BaseModel):
    action: Literal["like", "dislike", "switch_to_like", "switch_to_dislike"]


# --------------- Response ---------------

class CategoryResponse(BaseModel):
    id: int
    slug: str
    title: str
    locale: str
    order: int
    is_active: bool = True


class ArticleListItem(BaseModel):
    slug: str
    title: str
    description: Optional[str] = None
    readingMinutes: int
    categorySlug: Optional[str] = None


class ArticleListResponse(BaseModel):
    count: int
    articles: List[ArticleListItem]


class RelatedArticle(BaseModel):
    slug: str
    title: str
    description: Optional[str] = None
    readingMinutes: int


class ArticleResponse(BaseModel):
    slug: str
    title: str
    description: Optional[str] = None
    readingMinutes: int
    sections: List[ArticleSectionSchema]
    related: List[RelatedArticle]
    likesCount: int
    dislikesCount: int
    metaTitle: Optional[str] = None
    metaDescription: Optional[str] = None
    categorySlug: Optional[str] = None


class NavigationEntry(BaseModel):
    slug: str
    title: str


class NavigationCategory(BaseModel):
    slug: str
    title: str
    entries: List[NavigationEntry]


class FeedbackResponse(BaseModel):
    likes: int
    dislikes: int


class ArticleCreatedResponse(BaseModel):
    id: int
    slug: str
    title: str
    categorySlug: str


class ArticleUpdatedResponse(BaseModel):
    id: int
    slug: str
    title: str
    is_active: bool


class StatusResponse(BaseModel):
    status: str
    message: str
