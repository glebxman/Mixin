"""
Chat router — фасад для tutor_agent.

Vision-вызов вынесен в services/vision_service.py, чтобы router
оставался тонким (валидация payload + диспетчеризация).
"""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, constr
from typing import Optional

from services.tutor_agent import chat_with_tutor
from services.llm_service import stream_chat as llm_stream_chat
from services.vision_service import process_image_with_text

router = APIRouter()


class ChatHistoryMessage(BaseModel):
    role: constr(pattern=r"^(user|assistant|system)$")  # type: ignore[valid-type]
    content: constr(max_length=8000)  # type: ignore[valid-type]


class ChatRequest(BaseModel):
    student_id: constr(min_length=1, max_length=64)  # type: ignore[valid-type]
    session_id: Optional[str] = None
    message: constr(min_length=1, max_length=4000)  # type: ignore[valid-type]
    subject_id: Optional[str] = None
    history: list[ChatHistoryMessage] = Field(default_factory=list, max_length=48)
    student_first_name: Optional[str] = None
    images: list[dict] = Field(default_factory=list, max_length=1)


class QuestProposal(BaseModel):
    topic: str
    confidence: int


class ChatActions(BaseModel):
    questProposal: Optional[QuestProposal] = None
    quickCheck: bool = False
    hasVisual: bool = False
    imagePrompt: Optional[str] = None


class ChatStateInfo(BaseModel):
    topic: Optional[str] = None
    confidence: int = 0
    messagesOnTopic: int = 0


class ChatResponse(BaseModel):
    reply: str
    tokens_used: int
    actions: ChatActions
    state: ChatStateInfo


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
):
    # session_id обязателен для отслеживания comprehension state.
    # Если не передан — fallback на student_id (не идеально, но не падаем).
    session_key = request.session_id or f"student:{request.student_id}"

    if request.images:
        first = request.images[0]
        data_url = str(first.get("dataUrl") or "")
        mime_type = str(first.get("mimeType") or "image/jpeg")
        if data_url.startswith("data:image/"):
            reply = await process_image_with_text(
                prompt=request.message,
                data_url=data_url,
                mime_type=mime_type,
                student_context={"student_id": request.student_id},
            )
            return ChatResponse(
                reply=reply,
                tokens_used=0,
                actions=ChatActions(),
                state=ChatStateInfo(),
            )

    result = await chat_with_tutor(
        session_id=session_key,
        message=request.message,
        history=[m.model_dump() for m in request.history],
        student_id=request.student_id,
        student_first_name=request.student_first_name,
    )
    return ChatResponse(**result)


@router.post("/stream")
async def stream_chat(
    request: ChatRequest,
):
    """
    Stream-режим работает напрямую с LLM (без META-парсинга, чтобы не задерживать поток).
    После завершения стрима фронт может вызвать /api/chat/ для финального ответа с actions.
    Для MVP — рекомендуем использовать non-streaming /chat/.
    """
    return StreamingResponse(
        llm_stream_chat(
            student_id=request.student_id,
            message=request.message,
            history=[m.model_dump() for m in request.history],
        ),
        media_type="text/plain; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
