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
from backend.services.publications.publication_service import PublicationService
from backend.routes.publications.dependencies import get_publication_service
from backend.routes.auth import get_current_user
from backend.models.auth import User

router = APIRouter()


@router.post("/ai/generate", response_model=PublicationResponse, status_code=201)
async def generate_content_with_ai(
    request: AIGenerateRequest,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user),
):
    content = await service.generate_with_ai(request)
    publication_data = PublicationCreate(
        content_type=request.content_type,
        text_content=content,
        status=PublicationStatus.DRAFT,
        ai_generated=True,
        ai_prompt=request.prompt,
        channel_ids=[],
        tag_names=[],
    )
    return await service.create_publication(publication_data, owner_id=current_user.id)


@router.post("/ai/edit-text", response_model=AIEditTextResponse)
async def edit_text_with_ai(
    request: AIEditTextRequest,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user),
):
    result = await service.edit_text_with_ai(request.text, request.instruction)
    return AIEditTextResponse(result=result)


@router.post("/ai/edit-text-stream")
async def edit_text_with_ai_stream(
    request: AIEditTextRequest,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user),
):
    async def generate():
        try:
            async for chunk in service.edit_text_with_ai_stream(request.text, request.instruction):
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
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user),
):
    payload = data.model_copy(update={"publication_id": publication_id})
    publication = await service.edit_with_ai(payload, owner_id=current_user.id)
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    return publication
