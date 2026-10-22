from fastapi import APIRouter
from api.v1.auth import router as auth_router

# This is your central hub for v1
router = APIRouter()

# 1. Attach the auth endpoints under the /auth prefix
router.include_router(auth_router, prefix="/auth", tags=["auth"])

# 2. Your existing health check
@router.get("/health", tags=["health"])
async def health_check():
    return {"status": "Mediscan Vault API is running"}