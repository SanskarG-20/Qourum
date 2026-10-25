# Temporal evaluation report

Synthetic temporal evaluation over 5 seeds (42, 43, 44, 45, 46). Events were split chronologically 70/15/15. Strategy and baseline selection used validation data only. The best validation baseline was `club_popularity`.

The model column uses the validation-selected aggregation strategy with fairness and diversity enabled. Values are means with two-sided 95% t confidence intervals across seeds.

| Metric | Main model | Best baseline | Paired delta (95% CI) | Statistically better? |
| --- | ---: | ---: | ---: | --- |
| precision_at_3 | 0.083 [0.071, 0.094] | 0.100 [0.058, 0.141] | -0.017 [-0.062, +0.028] | False |
| recall_at_3 | 0.248 [0.213, 0.283] | 0.299 [0.175, 0.423] | -0.051 [-0.187, +0.085] | False |
| ndcg_at_3 | 0.178 [0.144, 0.212] | 0.210 [0.135, 0.285] | -0.032 [-0.131, +0.067] | False |
| type_hit_rate | 0.118 [0.045, 0.190] | 0.095 [0.015, 0.174] | +0.023 [-0.108, +0.154] | False |
| slot_hit_rate | 0.221 [0.092, 0.350] | 0.221 [0.092, 0.350] | +0.000 [+0.000, +0.000] | False |
| mean_satisfaction | 0.430 [0.402, 0.458] | 0.395 [0.357, 0.433] | +0.035 [+0.013, +0.057] | True |
| min_satisfaction | 0.153 [0.117, 0.189] | 0.114 [0.081, 0.148] | +0.038 [+0.027, +0.050] | True |
| satisfaction_std | 0.143 [0.128, 0.158] | 0.142 [0.123, 0.160] | +0.001 [-0.012, +0.014] | False |
| satisfaction_gini | 0.189 [0.162, 0.216] | 0.203 [0.177, 0.229] | -0.014 [-0.024, -0.004] | True |
| quorum_success_rate | 0.314 [0.141, 0.486] | 0.314 [0.141, 0.486] | +0.000 [+0.000, +0.000] | False |
| brier_score | 0.209 [0.194, 0.224] | 0.191 [0.175, 0.206] | +0.018 [+0.005, +0.032] | False |
| coverage | 0.867 [0.774, 0.959] | 0.250 [0.250, 0.250] | +0.617 [+0.524, +0.709] | True |
| intra_list_diversity | 0.931 [0.924, 0.938] | 0.688 [0.675, 0.701] | +0.243 [+0.224, +0.262] | True |

## Interpretation

Read the metrics and paired intervals together. Improvements are claimed only where the paired 95% interval excludes zero in the favorable direction. Historical event data cannot observe counterfactual attendance for recommendations that were not held.

`mean_satisfaction`, `min_satisfaction`, `satisfaction_std` and `satisfaction_gini` are the model's own predicted member scores for the event type each method selects, not observed outcomes, so they favor methods that agree with the scoring model. Treat `type_hit_rate`, the ranking metrics, and `brier_score` as the measures that compare predictions with what actually happened.

## Embedding ablation

Deltas compare the full model with the same model with content embeddings disabled, paired by seed. Positive deltas are favorable except for Brier score, where lower is better.

| Metric | Main minus no embeddings (95% CI) | Significant gain? |
| --- | ---: | --- |
| type_hit_rate | +0.040 [-0.075, +0.154] | False |
| ndcg_at_3 | +0.005 [-0.007, +0.017] | False |
| mean_satisfaction | +0.096 [+0.091, +0.102] | True |
| min_satisfaction | +0.014 [+0.009, +0.018] | True |
| brier_score | +0.025 [+0.016, +0.033] | False |
| quorum_success_rate | +0.000 [+0.000, +0.000] | False |

Primary endpoint: mean-satisfaction gain was statistically significant (+0.096, 95% CI [+0.091, +0.102]).

Paired intervals show significant embedding gains for: mean_satisfaction, min_satisfaction.

These results use synthetic data only. Any gain is weak evidence and does not establish performance on real clubs.
