from fastapi import FastAPI

from backend.routes.auth import router as auth_router


app = FastAPI(title="LAMA API")


app.include_router(auth_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


