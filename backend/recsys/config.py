"""Central constants for deterministic individual and group recommendation."""

ATTENDANCE_HALF_LIFE_DAYS = 120.0
EXPLICIT_CONFIDENCE_PRIOR = 3.0
IMPLICIT_CONFIDENCE_PRIOR = 4.0
TIME_CONFIDENCE_PRIOR = 8.0
TIME_LAPLACE_ALPHA = 1.0
# backend/evaluation/runner.py's validation-only weight search (see "Component
# weight tuning" in results/evaluation/REPORT.md) found that dropping
# CONTENT_BASE_WEIGHT to 0 significantly improves Brier score (calibration) in
# every one of 5 seeds, monotonically as the weight fell from 0.2 to 0.05 to 0.
# It is deliberately NOT applied here: the same change also significantly
# increases satisfaction_gini (+0.085 [+0.062, +0.107], member outcomes become
# more unequal), which runs directly against this project's own explicit
# fairness goals (fairness_weights(), the least_misery/fairness_aware
# strategies). Trading fairness for calibration is a product decision, not a
# pure optimization, so these defaults stay as the deliberately-chosen,
# evaluated baseline rather than the Brier-optimal point. A smaller reduction
# (e.g. content=0.05, also tested and close to content=0 on validation Brier)
# is a plausible middle ground but was not validated in isolation on the test
# split and would need its own run before adopting.
EXPLICIT_BASE_WEIGHT = 0.50
IMPLICIT_BASE_WEIGHT = 0.35
TIME_BASE_WEIGHT = 0.15
CONTENT_BASE_WEIGHT = 0.20
CONTENT_CONFIDENCE_PRIOR = 3.0
CONTENT_HALF_LIFE_DAYS = 240.0
COLD_START_BASE_WEIGHT = 1.0
COLD_START_RATE_PRIOR = 5.0
COLD_START_DEFAULT_RATE = 0.5
IMPLICIT_ATTENDED_VALUE = 1.0
IMPLICIT_YES_NO_SHOW_VALUE = 0.35
IMPLICIT_IGNORED_VALUE = 0.0
CANDIDATE_HORIZON_DAYS = 21
CANDIDATE_SLOT_STEP_HOURS = 1
DEFAULT_QUORUM_FRACTION = 0.30
DEFAULT_QUORUM_MINIMUM = 5
FAIRNESS_TARGET_SATISFACTION = 0.5
FAIRNESS_BOOST_MAX = 1.0
FAIRNESS_HALF_LIFE_DAYS = 180.0
MOST_PLEASURE_TOP_FRACTION = 0.20
APPROVAL_THRESHOLD = 0.60
MISERY_THRESHOLD = 0.30
MMR_RELEVANCE_WEIGHT = 0.75
