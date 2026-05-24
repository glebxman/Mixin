"""
Сервис аналитики для учеников.
Анализирует прогресс, активность и генерирует рекомендации без вызовов LLM.
Если в будущем понадобится LLM — используйте `services.llm_service.chat`.
"""

import json  # noqa: F401  # сохранён на случай будущего сериализационного кода
from typing import List, Dict


class AnalyticsService:
    """Сервис для генерации аналитики ученика"""

    def analyze_student_progress(
        self,
        student_profile: Dict,
        subject_progress: List[Dict] = None,
        ai_sessions: List[Dict] = None,
        quest_progress: List[Dict] = None,
    ) -> Dict:
        grade = student_profile.get("grade", 9)
        interests = student_profile.get("interests", [])
        favorite_subjects = student_profile.get("favoriteSubjects", [])

        total_study_time = self._calculate_study_time(ai_sessions or [])
        completed_quests = len(
            [q for q in (quest_progress or []) if q.get("status") == "COMPLETED"]
        )
        total_quests = len(quest_progress or []) if quest_progress else 50

        subject_scores = self._calculate_subject_scores(subject_progress or [])
        weekly_activity = self._calculate_weekly_activity(ai_sessions or [])
        strengths, weaknesses = self._analyze_strengths_weaknesses(
            subject_scores, favorite_subjects, interests
        )
        recommendations = self._generate_recommendations(
            student_profile, subject_scores, weaknesses
        )

        return {
            "overallProgress": self._calculate_overall_progress(subject_scores),
            "level": student_profile.get("level", 1),
            "xp": student_profile.get("xp", 0),
            "xpToNextLevel": 500,
            "streakDays": student_profile.get("streakDays", 0),
            "totalStudyTime": total_study_time,
            "subjectScores": subject_scores,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "recommendations": recommendations,
            "weeklyActivity": weekly_activity,
            "completedQuests": completed_quests,
            "totalQuests": total_quests,
        }

    def _calculate_study_time(self, ai_sessions: List[Dict]) -> int:
        total_minutes = 0
        for session in ai_sessions:
            messages_count = len(session.get("messages", []))
            total_minutes += messages_count * 2
        return total_minutes

    def _calculate_subject_scores(self, subject_progress: List[Dict]) -> List[Dict]:
        if not subject_progress:
            return [
                {"subject": "Математика", "score": 75, "trend": "stable"},
                {"subject": "Физика", "score": 70, "trend": "stable"},
                {"subject": "Информатика", "score": 80, "trend": "stable"},
                {"subject": "Химия", "score": 65, "trend": "stable"},
                {"subject": "Биология", "score": 72, "trend": "stable"},
                {"subject": "История", "score": 68, "trend": "stable"},
                {"subject": "География", "score": 70, "trend": "stable"},
                {"subject": "Литература", "score": 75, "trend": "stable"},
            ]

        scores = []
        for progress in subject_progress:
            subject_name = progress.get("subject", {}).get("name", "Предмет")
            score = progress.get("score", 0)
            trend = "up" if score >= 85 else ("down" if score < 65 else "stable")
            scores.append({"subject": subject_name, "score": score, "trend": trend})

        return scores

    def _calculate_weekly_activity(self, ai_sessions: List[Dict]) -> List[Dict]:
        from datetime import datetime, timedelta

        today = datetime.now()
        days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
        week_data = []

        for i in range(7):
            day_date = today - timedelta(days=6 - i)
            day_sessions = [
                s
                for s in ai_sessions
                if s.get("createdAt")
                and datetime.fromisoformat(
                    s["createdAt"].replace("Z", "+00:00")
                ).date()
                == day_date.date()
            ]

            minutes = len(day_sessions) * 5 + len(
                [msg for s in day_sessions for msg in s.get("messages", [])]
            ) * 2

            week_data.append({"day": days[day_date.weekday()], "minutes": minutes})

        if all(d["minutes"] == 0 for d in week_data):
            return [
                {"day": "Пн", "minutes": 30},
                {"day": "Вт", "minutes": 45},
                {"day": "Ср", "minutes": 20},
                {"day": "Чт", "minutes": 60},
                {"day": "Пт", "minutes": 40},
                {"day": "Сб", "minutes": 50},
                {"day": "Вс", "minutes": 25},
            ]

        return week_data

    def _calculate_overall_progress(self, subject_scores: List[Dict]) -> int:
        if not subject_scores:
            return 0
        avg_score = sum(s["score"] for s in subject_scores) / len(subject_scores)
        return int(avg_score)

    def _analyze_strengths_weaknesses(
        self,
        subject_scores: List[Dict],
        favorite_subjects: List[str],
        interests: List[str],
    ) -> tuple:
        strengths = []
        weaknesses = []

        for subject in subject_scores:
            if subject["score"] >= 80:
                strengths.append(f"{subject['subject']}: высокий уровень")
            elif subject["score"] < 65:
                weaknesses.append(f"{subject['subject']}: требует внимания")

        for interest in interests[:2]:
            strengths.append(interest.capitalize())

        if not weaknesses:
            weaknesses = ["Продолжайте в том же духе!"]

        return strengths[:5], weaknesses[:5]

    def _generate_recommendations(
        self,
        student_profile: Dict,
        subject_scores: List[Dict],
        weaknesses: List[str],
    ) -> List[Dict]:
        recommendations = []
        weak_subjects = [s for s in subject_scores if s["score"] < 70]

        for subject in weak_subjects[:2]:
            recommendations.append(
                {
                    "title": f"Подтяните {subject['subject'].lower()}",
                    "description": f"Уделите 30 минут в день. Текущий уровень: {subject['score']}%",
                    "priority": "high" if subject["score"] < 60 else "medium",
                }
            )

        if len(recommendations) < 3:
            recommendations.append(
                {
                    "title": "Практикуйтесь регулярно",
                    "description": "Решайте задачи каждый день для закрепления материала",
                    "priority": "medium",
                }
            )

        return recommendations[:3]
