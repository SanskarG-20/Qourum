# Temporal evaluation report

Synthetic temporal evaluation over 5 seeds (42, 43, 44, 45, 46). Events were split chronologically 70/15/15. Strategy and baseline selection used validation data only. The best validation baseline was `club_popularity`.

The model column uses the validation-selected aggregation strategy with fairness and diversity enabled. Values are means with two-sided 95% t confidence intervals across seeds.

| Metric | Main model | Best baseline | Paired delta (95% CI) | Statistically better? |
| --- | ---: | ---: | ---: | --- |
| precision_at_3 | 0.083 [0.069, 0.098] | 0.100 [0.058, 0.141] | -0.016 [-0.064, +0.032] | False |
| recall_at_3 | 0.250 [0.206, 0.294] | 0.299 [0.175, 0.423] | -0.048 [-0.193, +0.096] | False |
| ndcg_at_3 | 0.178 [0.138, 0.219] | 0.210 [0.135, 0.285] | -0.032 [-0.134, +0.070] | False |
| type_hit_rate | 0.119 [0.048, 0.190] | 0.095 [0.015, 0.174] | +0.025 [-0.075, +0.125] | False |
| slot_hit_rate | 0.221 [0.092, 0.350] | 0.221 [0.092, 0.350] | +0.000 [+0.000, +0.000] | False |
| mean_satisfaction | 0.362 [0.327, 0.397] | 0.329 [0.291, 0.366] | +0.033 [+0.010, +0.057] | True |
| min_satisfaction | 0.146 [0.113, 0.179] | 0.113 [0.083, 0.144] | +0.032 [+0.018, +0.047] | True |
| satisfaction_std | 0.142 [0.129, 0.156] | 0.135 [0.121, 0.150] | +0.007 [-0.003, +0.017] | False |
| satisfaction_gini | 0.223 [0.199, 0.248] | 0.234 [0.210, 0.258] | -0.011 [-0.022, +0.001] | False |
| quorum_success_rate | 0.314 [0.141, 0.486] | 0.314 [0.141, 0.486] | +0.000 [+0.000, +0.000] | False |
| brier_score | 0.189 [0.176, 0.202] | 0.191 [0.175, 0.206] | -0.001 [-0.009, +0.006] | False |
| coverage | 0.883 [0.827, 0.940] | 0.250 [0.250, 0.250] | +0.633 [+0.577, +0.690] | True |
| intra_list_diversity | 0.933 [0.928, 0.937] | 0.688 [0.675, 0.701] | +0.245 [+0.229, +0.260] | True |

## Interpretation

Read the metrics and paired intervals together. Improvements are claimed only where the paired 95% interval excludes zero in the favorable direction. Historical event data cannot observe counterfactual attendance for recommendations that were not held.

`mean_satisfaction`, `min_satisfaction`, `satisfaction_std` and `satisfaction_gini` are the model's own predicted member scores for the event type each method selects, not observed outcomes, so they favor methods that agree with the scoring model. Treat `type_hit_rate`, the ranking metrics, and `brier_score` as the measures that compare predictions with what actually happened.

## Embedding ablation

Deltas compare the full model with the same model with content embeddings disabled, paired by seed. Positive deltas are favorable except for Brier score, where lower is better.

| Metric | Main minus no embeddings (95% CI) | Significant gain? |
| --- | ---: | --- |
| type_hit_rate | +0.043 [-0.011, +0.097] | False |
| ndcg_at_3 | +0.005 [-0.004, +0.014] | False |
| mean_satisfaction | +0.028 [+0.025, +0.032] | True |
| min_satisfaction | +0.006 [+0.004, +0.008] | True |
| brier_score | +0.005 [+0.002, +0.007] | False |
| quorum_success_rate | +0.000 [+0.000, +0.000] | False |

Primary endpoint: mean-satisfaction gain was statistically significant (+0.028, 95% CI [+0.025, +0.032]).

Paired intervals show significant embedding gains for: mean_satisfaction, min_satisfaction.

## Component weight tuning

`main_model` above uses the deployed defaults in `backend/recsys/config.py` (explicit=0.5, implicit=0.35, time=0.15, content=0.05). As a diagnostic only, each seed also searches a fixed list of weight candidates, minimizing Brier score on that seed's validation split (~20 events) and tie-breaking by type_hit_rate; see `weight_search.csv` for every candidate tried. `ablation_searched_weights` re-runs the test split with that search's pick instead of the deployed defaults, everything else unchanged, isolating the weight difference alone. The search's pick is **not** applied to `main_model` or deployed anywhere; see CONTENT_BASE_WEIGHT's comment in config.py for why.

| Seed | Search's pick (explicit/implicit/time/content) |
| --- | --- |
| 42 | 0.60 / 0.40 / 0.10 / 0.00 |
| 43 | 0.60 / 0.40 / 0.10 / 0.00 |
| 44 | 0.60 / 0.40 / 0.10 / 0.00 |
| 45 | 0.60 / 0.40 / 0.10 / 0.00 |
| 46 | 0.50 / 0.35 / 0.15 / 0.00 |

Paired test-set delta, deployed defaults minus the search's pick (favorable direction depends on the metric: lower is better for brier_score, satisfaction_std, and satisfaction_gini; higher is better for the rest). A favorable delta here means the deployed defaults beat the search's pick; an unfavorable one means the search's pick would do better on that metric alone:

| Metric | Deployed minus searched (95% CI) | Deployed favorable? |
| --- | ---: | --- |
| type_hit_rate | +0.026 [-0.022, +0.074] | False |
| ndcg_at_3 | +0.005 [-0.010, +0.021] | False |
| mean_satisfaction | +0.039 [+0.031, +0.046] | True |
| min_satisfaction | +0.037 [+0.016, +0.057] | True |
| brier_score | +0.005 [+0.001, +0.008] | False |
| quorum_success_rate | +0.000 [+0.000, +0.000] | False |
| satisfaction_std | -0.016 [-0.027, -0.005] | True |
| satisfaction_gini | -0.053 [-0.076, -0.030] | True |

Paired intervals show the deployed defaults significantly beat the search's pick for: mean_satisfaction, min_satisfaction, satisfaction_std, satisfaction_gini.

Paired intervals show the search's pick would significantly beat the deployed defaults for: brier_score. That is the calibration/fairness tradeoff CONTENT_BASE_WEIGHT's comment in config.py explains; it is a deliberate choice, not an oversight.

These results use synthetic data only. Any gain is weak evidence and does not establish performance on real clubs.
