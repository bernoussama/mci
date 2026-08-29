import { useState } from "react";
import {
  MAX_DISCOVERY_QUESTIONS,
  type DiscoveryResponse,
  type DiscoveryTurn,
  type WorkflowSuggestion,
} from "../../shared/discovery-schema";
import { assessBusinessDiscovery } from "../services/discovery-client";

type BusinessOnboardingProps = {
  onChooseWorkflow(prompt: string): void;
  onSkip(): void;
  assess?: (turns: DiscoveryTurn[]) => Promise<DiscoveryResponse>;
};

type WrittenAnswerProps = {
  value: string;
  label: string;
  placeholder: string;
  loading: boolean;
  onChange(value: string): void;
  onContinue(): void;
};

const firstQuestion = "Tell us what your business does.";

function WrittenAnswer({ value, label, placeholder, loading, onChange, onContinue }: WrittenAnswerProps) {
  return (
    <div className="written-answer">
      <label htmlFor="discovery-answer">Your answer</label>
      <textarea
        id="discovery-answer"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading}
        autoFocus
      />
      <div className="written-answer-footer">
        <span>{loading ? "TraceFlow is assessing your answer..." : "A few honest sentences work best."}</span>
        <button type="button" disabled={!value.trim() || loading} onClick={onContinue}>
          {loading ? "Assessing..." : "Continue"}
        </button>
      </div>
    </div>
  );
}

export function BusinessOnboarding({
  onChooseWorkflow,
  onSkip,
  assess = assessBusinessDiscovery,
}: BusinessOnboardingProps) {
  const [turns, setTurns] = useState<DiscoveryTurn[]>([]);
  const [question, setQuestion] = useState(firstQuestion);
  const [answer, setAnswer] = useState("");
  const [assessment, setAssessment] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<WorkflowSuggestion[] | null>(null);
  const [source, setSource] = useState<"model" | "fallback" | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const questionNumber = turns.length + 1;

  async function submitAnswer() {
    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer || loading) return;

    const nextTurns = [...turns, { question, answer: trimmedAnswer }];
    setLoading(true);
    setError(null);

    try {
      const response = await assess(nextTurns);
      setTurns(nextTurns);
      setAssessment(response.decision.assessment);
      setSource(response.source);
      setWarning(response.warning);

      if (response.decision.stage === "complete") {
        setSuggestions(response.decision.suggestions);
        return;
      }

      setQuestion(response.decision.question!);
      setAnswer("");
    } catch {
      setError("TraceFlow could not assess that answer. Check the API server and try again.");
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setTurns([]);
    setQuestion(firstQuestion);
    setAnswer("");
    setAssessment(null);
    setSuggestions(null);
    setSource(null);
    setWarning(null);
    setError(null);
  }

  return (
    <main className="onboarding-screen">
      <header className="onboarding-nav">
        <a className="brand" href="/">TraceFlow</a>
        <button type="button" className="onboarding-skip" onClick={onSkip}>Skip to prompt</button>
      </header>

      <section className="onboarding-stage" aria-live="polite">
        {!suggestions && (
          <div className="onboarding-card">
            <div className="onboarding-progress" aria-label={`Question ${questionNumber} of up to ${MAX_DISCOVERY_QUESTIONS}`}>
              <span>AI business discovery</span>
              <div><i style={{ width: `${(questionNumber / MAX_DISCOVERY_QUESTIONS) * 100}%` }} /></div>
              <small>{questionNumber} of {MAX_DISCOVERY_QUESTIONS} max</small>
            </div>

            <p className="eyebrow">Follow the work</p>
            <h1>{question}</h1>
            <p className="onboarding-lead">
              {assessment ?? "TraceFlow will use each answer to decide what it needs to ask next."}
            </p>

            <WrittenAnswer
              label={questionNumber === 1 ? "Business description" : `Discovery answer ${questionNumber}`}
              value={answer}
              placeholder={questionNumber === 1
                ? "We run a 12-person property management company. We look after 80 rental homes for owners in Casablanca."
                : "Describe what happens today, who is involved, and where the work gets stuck."}
              loading={loading}
              onChange={setAnswer}
              onContinue={submitAnswer}
            />

            {warning && <p className="discovery-warning" role="status">{warning}</p>}
            {error && <p className="discovery-error" role="alert">{error}</p>}
          </div>
        )}

        {suggestions && (
          <div className="onboarding-card onboarding-results">
            <p className="eyebrow">Your automation shortlist</p>
            <h1>Here are the workflows worth testing first.</h1>
            <p className="onboarding-lead">{assessment}</p>

            <dl className="discovery-summary">
              {turns.map((turn, index) => (
                <div key={`${turn.question}-${index}`}>
                  <dt>{turn.question}</dt>
                  <dd>{turn.answer}</dd>
                </div>
              ))}
            </dl>

            <div className="automation-shortlist">
              {suggestions.map((suggestion) => (
                <article className="automation-idea runnable-idea" key={suggestion.title}>
                  <span>{source === "model" ? "Suggested by Luna" : "Fallback suggestion"}</span>
                  <h2>{suggestion.title}</h2>
                  <p>{suggestion.description}</p>
                  <button type="button" onClick={() => onChooseWorkflow(suggestion.prompt)}>Open in prompt builder</button>
                </article>
              ))}
            </div>

            {warning && <p className="discovery-warning" role="status">{warning}</p>}
            <button type="button" className="onboarding-back" onClick={restart}>Start discovery again</button>
          </div>
        )}
      </section>
    </main>
  );
}
