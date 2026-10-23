# Temporal evaluation report

Synthetic temporal evaluation over 5 seeds (42, 43, 44, 45, 46). Events were split chronologically 70/15/15. Strategy and baseline selection used validation data only. The best validation baseline was `club_popularity`.

The model column uses the validation-selected aggregation strategy with fairness and diversity enabled. Values are means with two-sided 95% t confidence intervals across seeds.

| Metric | Main model | Best baseline | Paired delta (95% CI) | Statistically better? |
| --- | ---: | ---: | ---: | --- |
| precision_at_3 | 0.080 [0.063, 0.097] | 0.100 [0.058, 0.141] | -0.019 [-0.071, +0.032] | False |
| recall_at_3 | 0.241 [0.190, 0.292] | 0.299 [0.175, 0.423] | -0.058 [-0.213, +0.097] | False |
| ndcg_at_3 | 0.174 [0.129, 0.218] | 0.210 [0.135, 0.285] | -0.037 [-0.145, +0.072] | False |
| type_hit_rate | 0.104 [-0.043, 0.250] | 0.095 [0.015, 0.174] | +0.009 [-0.105, +0.123] | False |
| slot_hit_rate | 0.221 [0.092, 0.350] | 0.221 [0.092, 0.350] | +0.000 [+0.000, +0.000] | False |
| mean_satisfaction | 0.336 [0.309, 0.363] | 0.301 [0.263, 0.339] | +0.035 [+0.010, +0.060] | True |
| min_satisfaction | 0.136 [0.106, 0.167] | 0.109 [0.086, 0.132] | +0.027 [+0.018, +0.036] | True |
| satisfaction_std | 0.146 [0.136, 0.155] | 0.134 [0.121, 0.148] | +0.011 [+0.000, +0.022] | False |
| satisfaction_gini | 0.246 [0.219, 0.272] | 0.253 [0.229, 0.276] | -0.007 [-0.015, +0.001] | False |
| quorum_success_rate | 0.314 [0.141, 0.486] | 0.314 [0.141, 0.486] | +0.000 [+0.000, +0.000] | False |
| brier_score | 0.184 [0.171, 0.197] | 0.191 [0.175, 0.206] | -0.006 [-0.012, +0.000] | False |
| coverage | 0.817 [0.730, 0.903] | 0.250 [0.250, 0.250] | +0.567 [+0.480, +0.653] | True |
| intra_list_diversity | 0.927 [0.921, 0.933] | 0.688 [0.675, 0.701] | +0.239 [+0.221, +0.257] | True |

## Interpretation

The model did not beat the club-popularity baseline on Precision@3, Recall@3, NDCG@3, or event-type hit rate. Paired confidence intervals for these metrics include zero. Mean and minimum predicted member satisfaction, coverage, and intra-list diversity improved with paired intervals above zero. The Brier score mean was lower, but its paired interval includes zero, so calibration improvement is inconclusive. Slot hit rate and observed historical quorum success were identical across methods; this offline split cannot observe counterfactual attendance for a recommendation that was not actually held. Satisfaction standard deviation increased, indicating a less even predicted satisfaction distribution; the fairness and diversity trade-off should not be described as an overall win.

These results use synthetic data only. They are a reproducible pipeline check, not evidence of performance on real clubs.
