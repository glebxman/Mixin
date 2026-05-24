from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.quest_generator import QuestGeneratorService, QuestDifficulty, QuestType

router = APIRouter()
quest_service = QuestGeneratorService()


class QuestGenerateRequest(BaseModel):
    subject: str
    topic: str
    grade: int
    difficulty: Optional[str] = "MEDIUM"
    questType: Optional[str] = "QUIZ"
    language: Optional[str] = "ru"


class QuestRecommendRequest(BaseModel):
    studentProfile: Dict
    limit: Optional[int] = 5


class QuestResponse(BaseModel):
    title: str
    description: str
    story: Optional[str] = None
    estimatedTime: int
    xpReward: int
    subject: str
    topic: str
    grade: int
    difficulty: str
    type: str
    tasks: List[Dict]
    skills: List[str]
    successCriteria: Dict
    language: str


@router.post("/generate", response_model=QuestResponse)
async def generate_quest(request: QuestGenerateRequest):
    """
    Генерирует образовательный квест
    """
    try:
        difficulty = QuestDifficulty(request.difficulty)
        quest_type = QuestType(request.questType)
        
        quest = quest_service.generate_quest(
            subject=request.subject,
            topic=request.topic,
            grade=request.grade,
            difficulty=difficulty,
            quest_type=quest_type,
            language=request.language
        )
        
        return quest
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommend", response_model=List[QuestResponse])
async def recommend_quests(request: QuestRecommendRequest):
    """
    Получить рекомендованные квесты для ученика
    """
    try:
        quests = quest_service.get_recommended_quests(
            student_profile=request.studentProfile,
            limit=request.limit
        )
        return quests
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
