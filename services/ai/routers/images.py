"""
Image generation router.
Изолирован от chat-роутера: image-генерация дороже и медленнее,
у неё свой путь и свой rate-limit.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, constr
from typing import Optional

from services.image_service import generate_image

router = APIRouter()


class GenerateImageRequest(BaseModel):
    prompt: constr(min_length=1, max_length=500)  # type: ignore[valid-type]
    student_age: Optional[int] = None


class GenerateImageResponse(BaseModel):
    dataUrl: str
    prompt: str
    model: str


@router.post("/", response_model=GenerateImageResponse)
async def generate(
    request: GenerateImageRequest,
):
    try:
        result = await generate_image(
            prompt=request.prompt,
            student_age=request.student_age,
        )
    except RuntimeError as exc:
        msg = str(exc)
        if "rate-limited" in msg.lower():
            raise HTTPException(status_code=429, detail=msg)
        raise HTTPException(status_code=502, detail=msg)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Image generation failed: {exc}")

    return GenerateImageResponse(**result.to_dict())
