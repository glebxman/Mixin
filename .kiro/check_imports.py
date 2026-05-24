import sys
from pathlib import Path

ai_root = Path(__file__).parent.parent / "services" / "ai"
sys.path.insert(0, str(ai_root))

import importlib
for name in [
    "services.openrouter",
    "services.llm_service",
    "services.vision_service",
    "services.image_service",
    "services.recommendations",
    "services.analytics",
    "services.quest_generator",
    "services.tutor_agent",
    "utils.json_extract",
]:
    m = importlib.import_module(name)
    print(f"OK  {name}: {m.__file__}")
