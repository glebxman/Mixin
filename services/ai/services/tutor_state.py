"""
Comprehension state tracker — отслеживает уровень понимания темы учеником.

Хранится в Redis по ключу `tutor:state:{session_id}`. На старте сессии state
пустой, обновляется на каждом обмене на основе META-сигналов от AI.

Ключевая идея: квесты предлагаются НЕ keyword-ом и НЕ после каждого ответа,
а когда несколько накопленных сигналов уверенности по теме пересекают порог.
"""

import json
import os
import time
from dataclasses import dataclass, asdict, field
from typing import Optional
import redis.asyncio as redis_async

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
STATE_TTL_SECONDS = 60 * 60 * 24  # 24 часа

# Пороги для предложения квеста
CONFIDENCE_THRESHOLD = 70           # минимум сравнимый "уровень"
MIN_MESSAGES_ON_TOPIC = 5           # минимум сообщений в текущей теме
MIN_PASSED_CHECKS = 2               # минимум пройденных мини-проверок
QUEST_COOLDOWN_SECONDS = 10 * 60    # не предлагать чаще раза в 10 минут


@dataclass
class TopicState:
    """Состояние понимания одной конкретной темы."""
    topic: str
    confidence: int = 0          # 0..100
    messages_on_topic: int = 0
    passed_checks: int = 0
    failed_checks: int = 0
    last_updated_at: float = field(default_factory=time.time)


@dataclass
class SessionState:
    """Полное состояние сессии чата."""
    current_topic: Optional[str] = None
    topics: dict[str, TopicState] = field(default_factory=dict)
    last_quest_proposed_at: float = 0.0
    last_quest_topic: Optional[str] = None
    last_image_requested_at: float = 0.0

    @classmethod
    def from_json(cls, raw: str) -> "SessionState":
        try:
            data = json.loads(raw)
            topics = {
                k: TopicState(**v) for k, v in (data.get("topics") or {}).items()
            }
            return cls(
                current_topic=data.get("current_topic"),
                topics=topics,
                last_quest_proposed_at=data.get("last_quest_proposed_at", 0),
                last_quest_topic=data.get("last_quest_topic"),
                last_image_requested_at=data.get("last_image_requested_at", 0),
            )
        except Exception:
            return cls()

    def to_json(self) -> str:
        return json.dumps(
            {
                "current_topic": self.current_topic,
                "topics": {k: asdict(v) for k, v in self.topics.items()},
                "last_quest_proposed_at": self.last_quest_proposed_at,
                "last_quest_topic": self.last_quest_topic,
                "last_image_requested_at": self.last_image_requested_at,
            },
            ensure_ascii=False,
        )


class TutorStateStore:
    """Redis-обёртка над SessionState."""

    def __init__(self, url: str | None = None) -> None:
        self.redis = redis_async.from_url(url or REDIS_URL, decode_responses=True)

    def _key(self, session_id: str) -> str:
        return f"tutor:state:{session_id}"

    async def load(self, session_id: str) -> SessionState:
        raw = await self.redis.get(self._key(session_id))
        return SessionState.from_json(raw) if raw else SessionState()

    async def save(self, session_id: str, state: SessionState) -> None:
        await self.redis.set(
            self._key(session_id), state.to_json(), ex=STATE_TTL_SECONDS
        )


def apply_meta_signal(state: SessionState, meta: dict) -> SessionState:
    """
    Применяет MetaSignal от AI к state.
    Возвращает обновлённый state (мутирует in-place).
    """
    raw_topic = meta.get("topic")
    topic_id = (raw_topic if isinstance(raw_topic, str) else "").strip() or "general"
    delta = max(-15, min(15, int(meta.get("confidence_delta", 0))))

    state.current_topic = topic_id
    topic = state.topics.get(topic_id) or TopicState(topic=topic_id)
    topic.messages_on_topic += 1
    topic.confidence = max(0, min(100, topic.confidence + delta))
    topic.last_updated_at = time.time()

    quick_check = meta.get("quick_check_passed")
    if quick_check is True:
        topic.passed_checks += 1
    elif quick_check is False:
        topic.failed_checks += 1

    state.topics[topic_id] = topic
    return state


def should_propose_quest(state: SessionState, ai_signal: bool) -> tuple[bool, dict]:
    """
    Серверная "трезвая" проверка. AI может думать, что готов к квесту,
    но мы дополнительно валидируем, чтобы не спамить предложениями.

    Возвращает (allowed, reason_dict).
    """
    now = time.time()
    topic_id = state.current_topic
    if not topic_id:
        return False, {"reason": "no_topic"}

    topic = state.topics.get(topic_id)
    if not topic:
        return False, {"reason": "topic_state_missing"}

    if not ai_signal:
        return False, {"reason": "ai_did_not_signal"}

    # Cooldown
    if now - state.last_quest_proposed_at < QUEST_COOLDOWN_SECONDS:
        return False, {"reason": "cooldown"}

    if topic.messages_on_topic < MIN_MESSAGES_ON_TOPIC:
        return False, {
            "reason": "too_few_messages",
            "have": topic.messages_on_topic,
            "need": MIN_MESSAGES_ON_TOPIC,
        }

    if topic.passed_checks < MIN_PASSED_CHECKS:
        return False, {
            "reason": "too_few_checks_passed",
            "have": topic.passed_checks,
            "need": MIN_PASSED_CHECKS,
        }

    if topic.confidence < CONFIDENCE_THRESHOLD:
        return False, {
            "reason": "low_confidence",
            "confidence": topic.confidence,
            "threshold": CONFIDENCE_THRESHOLD,
        }

    return True, {
        "reason": "ready",
        "confidence": topic.confidence,
        "messages": topic.messages_on_topic,
        "passed": topic.passed_checks,
    }
