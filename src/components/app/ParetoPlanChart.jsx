import React, { useMemo } from 'react';

const WIDTH = 680;
const HEIGHT = 370;
const MARGIN = { top: 22, right: 24, bottom: 68, left: 72 };

function currency(value) {
  return value === 0 ? 'Free' : `₹${value}`;
}

export function ParetoPlanChart({ sweep, memberCount, selectedPointId, onSelect }) {
  const chart = useMemo(() => {
    const points = sweep.points || [];
    const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
    const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
    const xMax = Math.max(1, memberCount);
    const x = (value) => MARGIN.left + (value / xMax) * innerWidth;
    const y = (value) => MARGIN.top + (1 - value) * innerHeight;
    const maxFee = Math.max(0, ...points.map((point) => point.dot_size_value));
    const byId = new Map(points.map((point) => [point.id, point]));
    const front = (sweep.pareto_front_ids || []).map((id) => byId.get(id)).filter(Boolean)
      .sort((a, b) => a.expected_turnout - b.expected_turnout || b.least_happy_satisfaction - a.least_happy_satisfaction);
    return {
      points: points.map((point) => ({
        ...point,
        cx: x(point.expected_turnout),
        cy: y(point.least_happy_satisfaction),
        radius: 6 + (maxFee > 0 ? 10 * Math.sqrt(point.dot_size_value / maxFee) : 0),
      })),
      front,
      frontLine: front.map((point) => `${x(point.expected_turnout)},${y(point.least_happy_satisfaction)}`).join(' '),
      x,
      y,
      innerWidth,
      innerHeight,
      xMax,
    };
  }, [sweep, memberCount]);

  return <section id="plan-sweep-chart" className="quorum-app__sweep-chart" aria-labelledby="sweep-chart-heading">
    <div className="quorum-app__sweep-heading">
      <div><h2 id="sweep-chart-heading">Compare plan options</h2><p>{sweep.plans_with_results} of {sweep.plans_generated} generated settings had a feasible result. Select a dot to load its plan.</p></div>
      <span className="quorum-app__sweep-dot-key"><i aria-hidden="true" />Dot size: {sweep.dot_size_label}</span>
    </div>
    <div className="quorum-app__chart-scroll">
      <svg className="quorum-app__pareto-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-labelledby="sweep-svg-title sweep-svg-description">
        <title id="sweep-svg-title">Plan options by expected turnout and least-happy member satisfaction</title>
        <desc id="sweep-svg-description">Each dot is one generated plan. Larger dots have a higher estimated fee per person. The outlined line connects plans on the Pareto front.</desc>
        {[0, .25, .5, .75, 1].map((tick) => <g key={tick}>
          <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={chart.y(tick)} y2={chart.y(tick)} className="quorum-app__chart-grid" />
          <text x={MARGIN.left - 10} y={chart.y(tick) + 4} textAnchor="end" className="quorum-app__chart-tick">{Math.round(tick * 100)}%</text>
        </g>)}
        {[0, .25, .5, .75, 1].map((fraction) => {
          const turnout = chart.xMax * fraction;
          return <g key={fraction}>
            <line x1={chart.x(turnout)} x2={chart.x(turnout)} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} className="quorum-app__chart-grid" />
            <text x={chart.x(turnout)} y={HEIGHT - MARGIN.bottom + 19} textAnchor="middle" className="quorum-app__chart-tick">{Math.round(turnout)}</text>
          </g>;
        })}
        <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={HEIGHT - MARGIN.bottom} y2={HEIGHT - MARGIN.bottom} className="quorum-app__chart-axis" />
        <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} className="quorum-app__chart-axis" />
        {chart.front.length > 1 && <polyline points={chart.frontLine} className="quorum-app__pareto-line" />}
        {chart.points.map((point) => {
          const selected = point.id === selectedPointId;
          const label = `${point.strategy}, fairness ${point.fairness ? 'on' : 'off'}, diversity ${point.diversity ? 'on' : 'off'}, ${point.fee_cap_label}; expected turnout ${point.expected_turnout.toFixed(1)}; least-happy satisfaction ${Math.round(point.least_happy_satisfaction * 100)}%; fee ${currency(point.dot_size_value)} per person; top suggestion ${point.top_format_name}${point.is_pareto_front ? '; Pareto front' : ''}`;
          return <circle key={point.id} cx={point.cx} cy={point.cy} r={point.radius}
            className={`quorum-app__chart-point${point.is_pareto_front ? ' is-front' : ''}${selected ? ' is-selected' : ''}`}
            role="button" tabIndex="0" aria-label={label} aria-pressed={selected}
            onClick={() => onSelect(point)}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(point); } }}>
            <title>{label}</title>
          </circle>;
        })}
        <text x={MARGIN.left + chart.innerWidth / 2} y={HEIGHT - 13} textAnchor="middle" className="quorum-app__chart-label">Expected turnout (members)</text>
        <text transform={`translate(18 ${MARGIN.top + chart.innerHeight / 2}) rotate(-90)`} textAnchor="middle" className="quorum-app__chart-label">Least-happy member satisfaction</text>
      </svg>
    </div>
    <p className="quorum-app__pareto-legend"><span aria-hidden="true" /> Pareto front: no other shown plan improves one measure without lowering the other.</p>
    {selectedPointId && <p className="quorum-app__diagnostic-note">Selected plan loaded into the organizer results below. Dot fee size shows {sweep.dot_size_label.toLowerCase()}.</p>}
  </section>;
}
