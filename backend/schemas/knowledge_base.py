from typing import List, Literal, Optional
from pydantic import BaseModel


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


class FeedbackRequest(BaseModel):
    action: Literal["like", "dislike"]


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
