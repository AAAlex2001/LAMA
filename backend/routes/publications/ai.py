from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from backend.schemas.publications.enums import PublicationStatus
from backend.schemas.publications.publication_base import PublicationCreate
from backend.schemas.publications.publication_response import PublicationResponse
from backend.schemas.publications.ai import (
    AIGenerateRequest,
    AIEditRequest,
    AIEditTextRequest,
    AIEditTextResponse,
)
from backend.services.publications.ai_service import AIService
from backend.services.publications.publication_create_service import PublicationCreateService
from backend.services.publications.publication_query_service import PublicationQueryService
from backend.routes.publications.dependencies import (
    get_ai_service,
    get_create_service,
    get_query_service,
)
from backend.routes.auth import get_current_user
from backend.models.auth import User

router = APIRouter()


@router.post("/ai/generate", response_model=PublicationResponse, status_code=201)
async def generate_content_with_ai(
    request: AIGenerateRequest,
    ai: AIService = Depends(get_ai_service),
    creator: PublicationCreateService = Depends(get_create_service),
    current_user: User = Depends(get_current_user),
):
    content = await ai.generate_content(request)
    publication_data = PublicationCreate(
        content_type=request.content_type,
        text_content=content,
        status=PublicationStatus.DRAFT,
        ai_generated=True,
        ai_prompt=request.prompt,
        channel_ids=[],
        tag_names=[],
    )
    return await creator.create_publication(publication_data, owner_id=current_user.id)


@router.post("/ai/edit-text", response_model=AIEditTextResponse)
async def edit_text_with_ai(
    request: AIEditTextRequest,
    ai: AIService = Depends(get_ai_service),
    current_user: User = Depends(get_current_user),
):
    result = await ai.edit_content(request.text, request.instruction)
    return AIEditTextResponse(result=result)


@router.post("/ai/edit-text-stream")
async def edit_text_with_ai_stream(
    request: AIEditTextRequest,
    ai: AIService = Depends(get_ai_service),
    current_user: User = Depends(get_current_user),
):
    async def generate():
        try:
            async for chunk in ai.edit_content_stream(request.text, request.instruction):
                yield f"data: {chunk}\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"
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
    ai: AIService = Depends(get_ai_service),
    query: PublicationQueryService = Depends(get_query_service),
    current_user: User = Depends(get_current_user),
):
    publication = await query.get_publication_or_404(publication_id, owner_id=current_user.id)
    if not publication.text_content:
        raise HTTPException(status_code=400, detail="Publication has no text content to edit")

    edited = await ai.edit_content(publication.text_content, data.instruction)
    publication.text_content = edited
    publication.ai_generated = True
    await query.db.flush()
    await query.db.refresh(publication)
    return publication
