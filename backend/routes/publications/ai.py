from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import OPENAI_API_KEY
from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.publications.ai import (
    AIEditRequest,
    AIEditTextRequest,
    AIEditTextResponse,
    AIGenerateRequest,
)
from backend.schemas.publications.enums import PublicationStatus
from backend.schemas.publications.publication_base import PublicationCreate
from backend.schemas.publications.publication_response import PublicationResponse
from backend.services.publications.features.ai.edit_content import EditContent
from backend.services.publications.features.ai.edit_content_stream import EditContentStream
from backend.services.publications.features.ai.generate_content import GenerateContent
from backend.services.publications.features.publications.create_publication import CreatePublication
from backend.services.publications.features.publications.lookup import find_publication_or_404

router = APIRouter()


@router.post("/ai/generate", response_model=PublicationResponse, status_code=201)
async def generate_content_with_ai(
    request: AIGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = await GenerateContent(OPENAI_API_KEY).execute(request)
    publication_data = PublicationCreate(
        content_type=request.content_type,
        text_content=content,
        status=PublicationStatus.DRAFT,
        ai_generated=True,
        ai_prompt=request.prompt,
        channel_ids=[],
        tag_names=[],
    )
    return await CreatePublication(db).execute(publication_data, owner_id=current_user.id)


@router.post("/ai/edit-text", response_model=AIEditTextResponse)
async def edit_text_with_ai(
    request: AIEditTextRequest,
    current_user: User = Depends(get_current_user),
):
    result = await EditContent(OPENAI_API_KEY).execute(request.text, request.instruction)
    return AIEditTextResponse(result=result)


@router.post("/ai/edit-text-stream")
async def edit_text_with_ai_stream(
    request: AIEditTextRequest,
    current_user: User = Depends(get_current_user),
):
    async def generate():
        try:
            async for chunk in EditContentStream(OPENAI_API_KEY).execute(
                request.text, request.instruction,
            ):
                yield f"data: {chunk}\n\n"
        except Exception as exc:
            yield f"data: [ERROR] {exc}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.post("/{publication_id}/ai/edit", response_model=PublicationResponse)
async def edit_content_with_ai(
    publication_id: int,
    data: AIEditRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    publication = await find_publication_or_404(db, publication_id, owner_id=current_user.id)
    if not publication.text_content:
        raise HTTPException(status_code=400, detail="Publication has no text content to edit")

    edited = await EditContent(OPENAI_API_KEY).execute(publication.text_content, data.instruction)
    publication.text_content = edited
    publication.ai_generated = True
    await db.flush()
    await db.refresh(publication)
    return publication
