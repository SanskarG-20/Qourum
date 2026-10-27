"""Shared configuration constants for the independent planning engine."""

from datetime import time

DEFAULT_HORIZON_DAYS = 21
MAX_HORIZON_DAYS = 30
DEFAULT_MIN_PEOPLE_AVAILABLE = 5
DEFAULT_TOP_K = 10
DEFAULT_SEED = 42
LOGISTIC_MIN_OBSERVATIONS = 10
LOGISTIC_REQUIRED_CLASSES = 2
COLD_START_INTERACTION_THRESHOLD = 3
HIGH_CONFIDENCE_INTERACTION_THRESHOLD = 8
FAIRNESS_RECENT_RATING_LIMIT = 10
FAIRNESS_RATING_HALF_LIFE_DAYS = 180.0
FALLBACK_AFFINITY_EVIDENCE_CAP = 4
AFFINITY_CROSS_CATEGORY_WEIGHT = 0.2
AFFINITY_SKILL_STEP_WEIGHT = 0.2
AFFINITY_DIRECT_PRIOR_COUNT = 2.0
BASELINE_PRIOR_COUNT = 2.0
BASELINE_PRIOR_PROBABILITY = 0.5
REPEAT_LAST_BLEND = 0.5
FAIRNESS_MAX_DISSATISFACTION_BOOST = 1.0
FAIRNESS_LEAST_MISERY_BLEND = 0.35
ATTENDANCE_INTERVAL_Z = 1.96
MMR_RELEVANCE_WEIGHT = 0.75
EXPLORATION_SCORE_WEIGHT = 0.12
SHORT_FORMAT_TARGET_MINUTES = 120
SHORT_FORMAT_SCORE_WEIGHT = 0.08
FEE_FEATURE_SCALE_INR = 1000.0
RATING_SCALE_MAX = 5.0
LAB_HEAVY_WEEKDAYS = (1, 3)  # Tuesday and Thursday, matching the synthetic calendar.
TIME_BLOCK_STARTS = {
    "morning": time(9), "midday": time(12), "afternoon": time(15),
    "evening": time(18), "late_evening": time(20, 30),
}
TIME_BLOCK_BOUNDARIES = (time(11), time(14), time(17), time(20))

# All one-click organizer recipes live here so their visible controls and
# technical labels stay tied to the settings sent to the planning engine.
PLAN_RECIPES = (
    {
        "id": "max_turnout", "label": "Max turnout", "technical_name": "average",
        "settings": {
            "strategy": "average", "fairness": False, "diversity": False,
            "fee_policy": "any", "fee_cap_inr": None, "selected_format_ids": [], "delivery_mode": "any",
            "skill_level_filter": "any", "exclude_lab_heavy_days": False,
            "prefer_short_formats": False, "exploration": False,
        },
    },
    {
        "id": "nobody_left_out", "label": "Nobody left out", "technical_name": "least_misery + fairness",
        "settings": {
            "strategy": "least_misery", "fairness": True, "diversity": False,
            "fee_policy": "any", "fee_cap_inr": None, "selected_format_ids": [], "delivery_mode": "any",
            "skill_level_filter": "any", "exclude_lab_heavy_days": False,
            "prefer_short_formats": False, "exploration": False,
        },
    },
    {
        "id": "budget_friendly", "label": "Budget-friendly", "technical_name": "median member fee cap",
        "fee_cap_rule": "median_member_max_fee",
        "settings": {
            "strategy": "average", "fairness": False, "diversity": False,
            "fee_policy": "any", "fee_cap_inr": None, "selected_format_ids": [], "delivery_mode": "any",
            "skill_level_filter": "any", "exclude_lab_heavy_days": False,
            "prefer_short_formats": False, "exploration": False,
        },
    },
    {
        "id": "try_something_new", "label": "Try something new", "technical_name": "MMR + novelty boost",
        "settings": {
            "strategy": "average", "fairness": False, "diversity": True,
            "fee_policy": "any", "fee_cap_inr": None, "selected_format_ids": [], "delivery_mode": "any",
            "skill_level_filter": "any", "exclude_lab_heavy_days": False,
            "prefer_short_formats": False, "exploration": True,
        },
    },
    {
        "id": "beginner_friendly", "label": "Beginner-friendly", "technical_name": "skill_level = beginner",
        "settings": {
            "strategy": "average", "fairness": False, "diversity": False,
            "fee_policy": "any", "fee_cap_inr": None, "selected_format_ids": [], "delivery_mode": "any",
            "skill_level_filter": "beginner", "exclude_lab_heavy_days": False,
            "prefer_short_formats": False, "exploration": False,
        },
    },
    {
        "id": "exam_season_light", "label": "Exam-season light", "technical_name": "exam/lab filters + short-format boost",
        "settings": {
            "strategy": "average", "fairness": False, "diversity": False,
            "fee_policy": "any", "fee_cap_inr": None, "selected_format_ids": [], "delivery_mode": "any",
            "skill_level_filter": "any", "exclude_lab_heavy_days": True,
            "prefer_short_formats": True, "exploration": False,
        },
    },
)
