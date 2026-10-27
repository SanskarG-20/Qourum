# Synthetic research dataset

Quorum’s research dataset is generated locally with `backend.synthetic_data.research_dataset`. It is separate from the app database seed data so the existing recommender and demo accounts retain their current schema. Every run is controlled by a seed; generated identifiers and values are stable for the same seed and configuration.

## Generate and merge

```powershell
py -3.11 -m backend.synthetic_data.cli --seed 42 --clubs 5 --history-months 18 --output-dir data/research
py -3.11 -m backend.synthetic_data.cli --seed 42 --real-csv-dir backend/synthetic_data/sample_csv --output-dir data/research-merged
```

Supply a directory containing any of the named table files (`clubs.csv`, `members.csv`, `formats.csv`, `calendar.csv`, `availability.csv`, `events.csv`, `attendance.csv`). Imported rows replace generated rows with the same primary key; otherwise they are added. Imported IDs must refer to rows present in the merged tables. All seven resulting tables are validated before output. `backend/synthetic_data/sample_csv/` is a minimal, valid example bundle. No generator code changes are needed to use another CSV dataset with the same columns.

## Tables

| Table | Columns | Primary key |
|---|---|---|
| `clubs` | `club_id`, `name`, `conflict_level` | `club_id` |
| `members` | `member_id`, `club_id`, `year`, `branch`, `role`, `join_month`, `max_fee`, `mode_pref`, `commute_type`, `engagement_level` | `member_id` |
| `formats` | `format_id`, `name`, `category`, `duration_hrs`, `typical_fee`, `team_based`, `skill_level`, `prep_days`, `min_capacity`, `max_capacity` | `format_id` |
| `calendar` | `date`, `exam_week`, `holiday`, `fest_week`, `lab_heavy_day` | `date` |
| `availability` | `member_id`, `day_of_week`, `time_block`, `status` | member + weekday + time block |
| `events` | `event_id`, `club_id`, `format_id`, `date`, `time_block`, `mode`, `fee`, `capacity`, `registrations`, `attended_count` | `event_id` |
| `attendance` | `event_id`, `member_id`, `registered`, `attended`, `rating` | event + member |

`day_of_week` uses Monday=0 through Sunday=6. Time blocks are morning, midday, afternoon, evening, and late evening. Member roles are `core` or `regular`; mode preference is `in_person`, `online`, or `either`. Format category is `technical`, `social`, `competitive`, or `learning`; format skill is `beginner`, `intermediate`, or `advanced`. Availability status is `free`, `maybe`, or `busy`. Event mode is `in_person` or `online`. Rating is nullable, otherwise 1–5.

## Generator assumptions

- The default run has five clubs, each with 25–60 members; configuration can select five or six clubs. History defaults to 18 months and can be set from 12 to 24 months.
- Club `conflict_level` is sampled uniformly from 0 to 1 unless explicitly supplied in `ResearchGenerationConfig.club_conflict_levels`. It controls persona mixing: at zero every club member shares a seeded club-level persona anchor; at one each member receives an independently sampled persona. Intermediate values use the anchor with probability `1 - conflict_level` and sample a persona with probability `conflict_level`.
- Exactly 16 catalog event formats are generated. Fee, duration, capacity range, team orientation, skill level, and preparation time are fixed catalog assumptions, not estimates learned from real clubs.
- Each member receives one hidden behavior persona: enthusiast, social-only, competitive, casual, or exam-sensitive. Persona is not included in exported tables. Its parameters are:

  | Persona | Fee sensitivity | Evening preference | Exam-week dropout | Engagement label |
  |---|---:|---:|---:|---|
  | enthusiast | 0.20 | 0.70 | 0.12 | high |
  | social-only | 0.55 | 0.85 | 0.35 | medium |
  | competitive | 0.30 | 0.55 | 0.18 | high |
  | casual | 0.80 | 0.55 | 0.50 | low |
  | exam-sensitive | 0.50 | 0.65 | 0.88 | medium |

  Base event interest is 0.72 for enthusiasts, 0.68 for social-only members at social events (0.12 otherwise), 0.75 for competitive members at competitive events (0.28 otherwise), 0.42 for casual members, and 0.55 for exam-sensitive members. Persona, fees, and preferences are all generated; they are not observed member data.
- Member count is sampled uniformly as an integer from 25 through 60. Year is uniform 1–4; branch is uniform from Computer Science, Electronics, Design, Business, and Mechanical; commute type is uniform from walk, transit, cycle, and residential; maximum fee is uniform from ₹0, ₹100, ₹250, ₹500, and ₹1,000. Mode preference is sampled as in-person 62%, online 13%, or either 25%. Joining month is uniform over the configured history months. Core role is assigned to the first `max(3, round(12% of club size))` generated members; remaining members are regular. `engagement_level` comes from the persona table and is not measured behavior.
- Availability has one row for each member × weekday × five time blocks. The persona-specific preferred block is sampled from morning 6%, midday 10%, afternoon 18%, evening according to the persona’s evening preference, and late evening with the remaining probability; these weights are normalized to sum to one. A preferred block is free 74%, maybe 12%, busy 14%; another block is free 48%, maybe 12%, busy 40%.
- The daily calendar marks exam periods on days 8–21 of April, May, November, and December; festival periods on days 10–24 of January, February, September, and October; every Sunday as a holiday plus January 1; and Tuesday/Thursday as lab-heavy. These are generic placeholders, not a university’s academic calendar.
- Each club receives exactly three events per history month on dates sampled without replacement across the history window. Event time blocks follow morning 7%, midday 12%, afternoon 22%, evening 43%, and late evening 16%; event mode is in-person 78% or online 22%. Capacity is uniform over the selected format’s inclusive capacity bounds. Generated fees vary by ±25% around the format’s typical fee and are rounded to the nearest ₹10.
- Registration propensity begins with the persona-format affinity above. If the fee exceeds a member’s maximum, propensity is multiplied by `max(0.05, 1 - fee_sensitivity × (fee - max_fee) / max(100, fee))`. A mode mismatch multiplies it by 0.45, a non-preferred block by 0.62, and an exam-week date by `1 - exam_dropout`. The final propensity is clipped to 2%–92%. If registrations exceed capacity, a seeded random subset is admitted up to capacity. The persona-mixing effect of `conflict_level` captures club preference divergence; it is not a separate attendance penalty.
- Registered members attend with probability 88% outside exam periods and 58% during them. Attendees receive a rating by rounding a Normal(4.1, 0.8) sample and clipping it to 1–5; registered non-attendees and non-registered members have null ratings. These outcomes are synthetic assumptions, not a behavioral estimate from real observations.
- CSV rows override by primary key, including generated rows. The merged result must pass required-column, uniqueness, enum, range, capacity/count, calendar, and foreign-key checks. IDs are strings and must be consistent across related files.

All generated data is synthetic. Results from this dataset do not establish that the assumed behavior matches real student clubs.
