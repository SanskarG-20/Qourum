# Temporal evaluation report

Synthetic temporal evaluation over 5 seeds (42, 43, 44, 45, 46). Events were split chronologically 70/15/15. Strategy and baseline selection used validation data only. The best validation baseline was `club_popularity`.

The model column uses the validation-selected aggregation strategy with fairness and diversity enabled. Values are means with two-sided 95% t confidence intervals across seeds.

| Metric | Main model | Best baseline | Paired delta (95% CI) | Statistically better? |
| --- | ---: | ---: | ---: | --- |
| precision_at_3 | 0.080 [0.066, 0.094] | 0.100 [0.058, 0.141] | -0.020 [-0.069, +0.030] | False |
| recall_at_3 | 0.239 [0.197, 0.281] | 0.299 [0.175, 0.423] | -0.060 [-0.208, +0.089] | False |
| ndcg_at_3 | 0.173 [0.135, 0.211] | 0.210 [0.135, 0.285] | -0.037 [-0.142, +0.068] | False |
| type_hit_rate | 0.094 [0.068, 0.119] | 0.095 [0.015, 0.174] | -0.001 [-0.083, +0.081] | False |
| slot_hit_rate | 0.221 [0.092, 0.350] | 0.221 [0.092, 0.350] | +0.000 [+0.000, +0.000] | False |
| mean_satisfaction | 0.323 [0.290, 0.355] | 0.291 [0.253, 0.329] | +0.032 [+0.007, +0.057] | True |
| min_satisfaction | 0.109 [0.086, 0.131] | 0.081 [0.066, 0.095] | +0.028 [+0.014, +0.043] | True |
| satisfaction_std | 0.158 [0.150, 0.166] | 0.144 [0.129, 0.160] | +0.014 [+0.005, +0.022] | False |
| satisfaction_gini | 0.276 [0.254, 0.299] | 0.281 [0.253, 0.308] | -0.004 [-0.013, +0.004] | False |
| quorum_success_rate | 0.314 [0.141, 0.486] | 0.314 [0.141, 0.486] | +0.000 [+0.000, +0.000] | False |
| brier_score | 0.184 [0.171, 0.198] | 0.191 [0.175, 0.206] | -0.006 [-0.012, -0.000] | True |
| coverage | 0.900 [0.813, 0.987] | 0.250 [0.250, 0.250] | +0.650 [+0.563, +0.737] | True |
| intra_list_diversity | 0.933 [0.928, 0.939] | 0.688 [0.675, 0.701] | +0.245 [+0.232, +0.259] | True |

## Interpretation

Read the metrics and paired intervals together. Improvements are claimed only where the paired 95% interval excludes zero in the favorable direction. Historical event data cannot observe counterfactual attendance for recommendations that were not held.

`mean_satisfaction`, `min_satisfaction`, `satisfaction_std` and `satisfaction_gini` are the model's own predicted member scores for the event type each method selects, not observed outcomes, so they favor methods that agree with the scoring model. Treat `type_hit_rate`, the ranking metrics, and `brier_score` as the measures that compare predictions with what actually happened.

## Embedding ablation

Deltas compare the full model with the same model with content embeddings disabled, paired by seed. Positive deltas are favorable except for Brier score, where lower is better.

| Metric | Main minus no embeddings (95% CI) | Significant gain? |
| --- | ---: | --- |
| type_hit_rate | +0.000 [+0.000, +0.000] | False |
| ndcg_at_3 | +0.000 [+0.000, +0.000] | False |
| mean_satisfaction | +0.000 [+0.000, +0.000] | False |
| min_satisfaction | +0.000 [+0.000, +0.000] | False |
| brier_score | +0.000 [+0.000, +0.000] | False |
| quorum_success_rate | +0.000 [+0.000, +0.000] | False |

Primary endpoint: the mean-satisfaction embedding delta was not statistically significant (inconclusive; +0.000, 95% CI [+0.000, +0.000]).

No embedding-related gain was statistically significant under the paired 95% intervals for the reported metrics.

## Component weight tuning

Each seed picks base weights (explicit/implicit/time/content) from a fixed list of candidates by minimizing Brier score on that seed's validation split (~20 events), tie-broken by type_hit_rate; see `weight_search.csv` for every candidate tried. `ablation_default_weights` re-runs the test split with the pre-tuning defaults (explicit=0.5, implicit=0.35, time=0.15, content=0.2) instead, everything else unchanged, so the comparison below isolates the weight change alone.

| Seed | Tuned weights (explicit/implicit/time/content) |
| --- | --- |
| 42 | 0.60 / 0.40 / 0.10 / 0.00 |
| 43 | 0.60 / 0.40 / 0.10 / 0.00 |
| 44 | 0.60 / 0.40 / 0.10 / 0.00 |
| 45 | 0.60 / 0.40 / 0.10 / 0.00 |
| 46 | 0.50 / 0.35 / 0.15 / 0.00 |

Paired test-set delta, tuned weights minus the pre-tuning defaults (positive favorable except Brier score):

| Metric | Tuned minus default (95% CI) | Significant gain? |
| --- | ---: | --- |
| type_hit_rate | -0.033 [-0.091, +0.024] | False |
| ndcg_at_3 | -0.005 [-0.018, +0.008] | False |
| mean_satisfaction | -0.106 [-0.114, -0.097] | False |
| min_satisfaction | -0.042 [-0.064, -0.021] | False |
| brier_score | -0.025 [-0.034, -0.015] | True |
| quorum_success_rate | +0.000 [+0.000, +0.000] | False |

Paired intervals show significant gains from weight tuning for: brier_score.

These results use synthetic data only. Any gain is weak evidence and does not establish performance on real clubs.
