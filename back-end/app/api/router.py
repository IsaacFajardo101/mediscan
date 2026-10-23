from fastapi import APIRouter
from api.v1.auth import router as auth_router
from api.v1.profiles import router as profiles_router
from api.v1.medicines import router as medicines_router

router = APIRouter()

# Mount Auth
router.include_router(auth_router, prefix="/auth", tags=["auth"])

# Mount Profiles
router.include_router(profiles_router, prefix="/accounts/me/profiles", tags=["profiles"])

# Mount Medicines
router.include_router(medicines_router, prefix="/medicines", tags=["medicines"])

@router.get("/health", tags=["health"])
async def health_check():
    return {"status": "Mediscan Vault API is running"}