import pytest
from sqlalchemy import select

from backend.models.publications import (
    ContentType as DBContentType,
    Publication,
    PublicationStatus as DBPublicationStatus,
)
from backend.services.publications.features.publications.delete_publication import DeletePublication


@pytest.mark.asyncio
async def test_delete_removes_publication(db, test_user):
    pub = Publication(
        owner_id=test_user.id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.DRAFT,
        text_content="bye",
    )
    db.add(pub)
    await db.commit()
    await db.refresh(pub)
    pub_id = pub.id

    await DeletePublication(db).execute(pub)
    await db.commit()

    remaining = (await db.execute(
        select(Publication).where(Publication.id == pub_id)
    )).scalar_one_or_none()
    assert remaining is None
