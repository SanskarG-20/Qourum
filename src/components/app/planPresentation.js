const rounded = (value, places = 0) => {
  const scale = 10 ** places;
  return Math.round(Number(value) * scale) / scale;
};

const displayNumber = (value, places = 0) => rounded(value, places).toLocaleString('en-IN', {
  minimumFractionDigits: places,
  maximumFractionDigits: places,
});

export function planCardView(item) {
  const [lower, upper] = item.expected_attendance_interval_95;
  const expected = Number(item.expected_attendance);
  const radius = Math.max(expected - Number(lower), Number(upper) - expected);
  const availableCount = item.available_member_ids.length;
  const satisfaction = Object.entries(item.per_member_satisfaction)
    .filter(([, result]) => result.available && result.satisfaction !== null)
    .map(([memberId, result]) => ({ memberId, score: Number(result.satisfaction) }));
  const lowest = satisfaction.reduce((current, member) => current === null || member.score < current.score ? member : current, null);
  const mean = Number(item.group_summary.mean);
  const minimum = Number(item.group_summary.minimum);

  return {
    turnout: `${displayNumber(expected)} ± ${displayNumber(radius)} of ${displayNumber(availableCount)}`,
    why: `About ${displayNumber(expected)} of ${displayNumber(availableCount)} available members may attend. Average interest is ${displayNumber(mean * 100)}%, and the lowest is ${displayNumber(minimum * 100)}%.`,
    members: Object.entries(item.per_member_satisfaction).map(([memberId, result]) => {
      const memberScore = result.available && result.satisfaction !== null ? Number(result.satisfaction) : null;
      return {
        memberId,
        available: result.available,
        score: memberScore,
        percent: memberScore === null ? null : Math.round(memberScore * 100),
        isLowest: memberScore !== null && memberId === lowest?.memberId,
        unavailableReasons: result.unavailable_reasons ?? [],
      };
    }),
    lowestScore: lowest?.score ?? null,
    meanScore: mean,
    expected,
    interval: [Number(lower), Number(upper)],
    availableCount,
  };
}
