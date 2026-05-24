from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import sys
from pathlib import Path

# Добавляем путь к services
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.recommendations import RecommendationService

router = APIRouter()
recommendation_service = RecommendationService()


# ─── REQUEST/RESPONSE MODELS ─────────────────────────────────────────


class StudentProfile(BaseModel):
    grade: int
    age: Optional[int] = None
    interests: List[str] = []
    favoriteSubjects: List[str] = []
    careerDirection: Optional[str] = None
    language: str = "ru"


class TopicRecommendation(BaseModel):
    subject: str
    topic: str
    reason: str
    difficulty: str
    priority: int


class Material(BaseModel):
    text: str
    subject: str
    filename: str
    score: float


class StudyPlanDay(BaseModel):
    day: int
    subjects: List[Dict]


class StudyPlan(BaseModel):
    weekly_plan: List[StudyPlanDay]
    tips: List[str]
    goals: List[str]


class QuestRecommendation(BaseModel):
    title: str
    subject: str
    description: str
    difficulty: str
    estimated_time: str
    xp_reward: int
    skills: List[str]
    reason: str


class LearningStyleAnalysis(BaseModel):
    learning_type: str
    optimal_session_duration: int
    preferred_content: List[str]
    memory_techniques: List[str]
    recommendations: List[str]


class CareerRecommendation(BaseModel):
    profession: str
    university: Optional[str] = None
    match_score: float
    reasoning: str


# ─── ENDPOINTS ───────────────────────────────────────────────────────


@router.post("/topics", response_model=List[TopicRecommendation])
async def get_topic_recommendations(profile: StudentProfile):
    """
    Получить персонализированные рекомендации по темам для изучения
    """
    try:
        recommendations = recommendation_service.get_personalized_topics(
            student_profile=profile.dict(),
            limit=5
        )
        return recommendations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/materials")
async def get_relevant_materials(
    topic: str,
    subject: str,
    grade: int,
    language: str = "ru",
    limit: int = 3
):
    """
    Найти релевантные материалы из учебников по теме
    """
    try:
        materials = recommendation_service.get_relevant_materials(
            topic=topic,
            subject=subject,
            grade=grade,
            language=language,
            limit=limit
        )
        return {"materials": materials}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/study-plan", response_model=StudyPlan)
async def generate_study_plan(
    profile: StudentProfile,
    weak_subjects: Optional[List[str]] = None,
    days_per_week: int = 5
):
    """
    Сгенерировать персональный план обучения на неделю
    """
    try:
        plan = recommendation_service.get_study_plan(
            student_profile=profile.dict(),
            weak_subjects=weak_subjects,
            days_per_week=days_per_week
        )
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quests", response_model=List[QuestRecommendation])
async def get_quest_recommendations(
    profile: StudentProfile,
    completed_quests: Optional[List[str]] = None,
    limit: int = 3
):
    """
    Получить рекомендации по квестам
    """
    try:
        quests = recommendation_service.get_next_quest_recommendations(
            student_profile=profile.dict(),
            completed_quests=completed_quests,
            limit=limit
        )
        return quests
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/learning-style", response_model=LearningStyleAnalysis)
async def analyze_learning_style(
    profile: StudentProfile,
    quiz_results: Optional[Dict] = None
):
    """
    Проанализировать стиль обучения ученика
    """
    try:
        analysis = recommendation_service.analyze_learning_style(
            student_profile=profile.dict(),
            quiz_results=quiz_results
        )
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/career", response_model=List[CareerRecommendation])
async def get_career_recommendations(profile: StudentProfile):
    """
    Получить рекомендации по профессиям и университетам (legacy endpoint)
    """
    # TODO: Implement career recommendations with university database
    return []
