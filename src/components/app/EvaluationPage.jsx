import React, { useEffect, useState } from 'react';
import './evaluation-page.css';

const percent = (value) => `${(value * 100).toFixed(1)}%`;

function ResultsSection({ title, section, prefix }) {
  if (section.status !== 'available') {
    return <section className="evaluation__panel"><h2>{title}</h2><p>{section.reason}</p></section>;
  }
  return <section className="evaluation__panel">
    <h2>{title}</h2>
    <p>{section.train_events} older events for training · {section.test_events} newer events for testing.</p>
    <h3>Attendance prediction and organizer-choice agreement</h3>
    <div className="evaluation__scroll"><table><thead><tr><th scope="col">Method</th><th scope="col">Attendance MAE</th><th scope="col">Hit@3</th><th scope="col">Test events</th></tr></thead><tbody>{section.baselines.map((row) => <tr key={row.method}><th scope="row">{row.method.replaceAll('_', ' ')}</th><td>{row.mae_attendance.toFixed(2)} people</td><td>{percent(row.hit_at_3)}</td><td>{row.test_events}</td></tr>)}</tbody></table></div>
    <img src={`/evaluation/${prefix}-baselines.png`} alt={`${title} chart comparing attendance error and organizer choice Hit at 3 for four methods`} />
    <h3>Group conflict</h3>
    <p>Each row evaluates a club at the stated conflict level. Satisfaction is predicted by the model, not observed for unheld events.</p>
    <div className="evaluation__scroll"><table><thead><tr><th scope="col">Conflict</th><th scope="col">Strategy</th><th scope="col">Least-happy member</th><th scope="col">Gini</th></tr></thead><tbody>{section.conflict_sweep.map((row) => <tr key={`${row.club}-${row.strategy}`}><td>{row.conflict_level.toFixed(2)}</td><th scope="row">{row.strategy.replaceAll('_', ' ')}</th><td>{percent(row.minimum_satisfaction)}</td><td>{row.gini.toFixed(3)}</td></tr>)}</tbody></table></div>
    <img src={`/evaluation/${prefix}-conflict.png`} alt={`${title} charts of minimum predicted satisfaction and Gini across club conflict levels`} />
    <h3>Fairness and diversity ablations</h3>
    <div className="evaluation__scroll"><table><thead><tr><th scope="col">Fairness</th><th scope="col">Diversity</th><th scope="col">Least-happy member</th><th scope="col">Expected turnout</th><th scope="col">Category coverage@3</th></tr></thead><tbody>{section.ablations.map((row) => <tr key={`${row.fairness}-${row.diversity}`}><td>{row.fairness ? 'On' : 'Off'}</td><td>{row.diversity ? 'On' : 'Off'}</td><td>{percent(row.minimum_satisfaction)}</td><td>{row.expected_turnout.toFixed(1)}</td><td>{percent(row.category_coverage_at_3)}</td></tr>)}</tbody></table></div>
    <img src={`/evaluation/${prefix}-ablations.png`} alt={`${title} chart of minimum predicted satisfaction and category coverage with fairness and diversity on or off`} />
  </section>;
}

export default function EvaluationPage() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/evaluation/report.json').then((response) => {
      if (!response.ok) throw new Error('Saved evaluation results are missing. Run the evaluation command first.');
      return response.json();
    }).then(setReport).catch((reason) => setError(reason.message));
  }, []);
  return <main className="evaluation">
    <header className="evaluation__header"><a href="/app">← Club planner</a><span>QUORUM / EVALUATION</span></header>
    <div className="evaluation__content"><p className="evaluation__eyebrow">Evidence, with limits</p><h1>Planning evaluation</h1>
      {error && <p role="alert">{error}</p>}
      {!report && !error && <p role="status">Loading saved results…</p>}
      {report && <><p>{report.methodology} Seed: {report.seed}.</p><p className="evaluation__caveat">{report.hit_caveat} {report.satisfaction_caveat}</p>
        <ResultsSection title="Synthetic data" section={report.synthetic} prefix="synthetic" />
        <ResultsSection title="Real data" section={report.real} prefix="real" />
      </>}
    </div>
  </main>;
}
