from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.analytics import AnalyticsService

router = APIRouter()
analytics_service = AnalyticsService()


class StudentAnalyticsRequest(BaseModel):
    studentId: str
    studentProfile: Dict
    subjectProgress: Optional[List[Dict]] = None
    aiSessions: Optional[List[Dict]] = None
    questProgress: Optional[List[Dict]] = None


class SubjectScore(BaseModel):
    subject: str
    score: int
    trend: str


class WeeklyActivity(BaseModel):
    day: str
    minutes: int


class Recommendation(BaseModel):
    title: str
    description: str
    priority: str


class AnalyticsResponse(BaseModel):
    overallProgress: int
    level: int
    xp: int
    xpToNextLevel: int
    streakDays: int
    totalStudyTime: int
    subjectScores: List[SubjectScore]
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[Recommendation]
    weeklyActivity: List[WeeklyActivity]
    completedQuests: int
    totalQuests: int


@router.post("/student", response_model=AnalyticsResponse)
async def get_student_analytics(request: StudentAnalyticsRequest):
    """
    Получить полную аналитику ученика
    """
    try:
        analytics = analytics_service.analyze_student_progress(
            student_profile=request.studentProfile,
            subject_progress=request.subjectProgress,
            ai_sessions=request.aiSessions,
            quest_progress=request.questProgress
        )
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
