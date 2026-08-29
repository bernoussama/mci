import { useState } from "react";

type BusinessOnboardingProps = {
  onBuild(prompt: string): void;
  onSkip(): void;
};

const opportunities = {
  approvals: { title: "Request and approval routing", description: "Collect requests, apply policy, and route exceptions to the right owner." },
  documents: { title: "Document data capture", description: "Extract structured fields from documents before a person reviews them." },
  handoffs: { title: "Customer request triage", description: "Classify incoming requests and assign an accountable owner." },
  reporting: { title: "Recurring report assembly", description: "Gather team updates and produce a consistent report." },
  general: { title: "Process intake and routing", description: "Turn an informal request into a tracked process with a clear next owner." },
};

function findOpportunity(text: string) {
  const answer = text.toLowerCase();
  if (/approv|sign.?off|permission|waiting/.test(answer)) return opportunities.approvals;
  if (/document|invoice|copy|paste|data entry|retype|extract/.test(answer)) return opportunities.documents;
  if (/customer|handoff|assign|owner|lost/.test(answer)) return opportunities.handoffs;
  if (/report|spreadsheet|status|update|dashboard/.test(answer)) return opportunities.reporting;
  return opportunities.general;
}

type WrittenAnswerProps = {
  value: string;
  label: string;
  placeholder: string;
  onChange(value: string): void;
  onContinue(): void;
};

function WrittenAnswer({ value, label, placeholder, onChange, onContinue }: WrittenAnswerProps) {
  return (
    <div className="written-answer">
      <label htmlFor="discovery-answer">Your answer</label>
      <textarea
        id="discovery-answer"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        autoFocus
      />
      <div className="written-answer-footer">
        <span>A few honest sentences work best.</span>
        <button type="button" disabled={!value.trim()} onClick={onContinue}>Continue</button>
      </div>
    </div>
  );
}

export function BusinessOnboarding({ onBuild, onSkip }: BusinessOnboardingProps) {
  const [step, setStep] = useState(0);
  const [business, setBusiness] = useState("");
  const [repetitiveWork, setRepetitiveWork] = useState("");
  const [bottleneck, setBottleneck] = useState("");

  const discoveredOpportunity = findOpportunity(`${repetitiveWork} ${bottleneck}`);
  const expensePrompt = [
    `Build an expense approval workflow for this business: ${business.trim()}.`,
    `Their team described this repetitive work: ${repetitiveWork.trim()}.`,
    `Their main bottleneck is: ${bottleneck.trim()}.`,
    "Employees submit a receipt. Read the merchant and amount. Expenses above $500 need manager approval.",
  ].join(" ");

  return (
    <main className="onboarding-screen">
      <header className="onboarding-nav">
        <a className="brand" href="/">MCI</a>
        <button type="button" className="onboarding-skip" onClick={onSkip}>Skip to prompt</button>
      </header>

      <section className="onboarding-stage" aria-live="polite">
        {step < 3 && (
          <div className="onboarding-card">
            <div className="onboarding-progress" aria-label={`Question ${step + 1} of 3`}>
              <span>Business discovery</span>
              <div><i style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
              <small>{step + 1} of 3</small>
            </div>

            {step === 0 && (
              <>
                <p className="eyebrow">Start with your business</p>
                <h1>Tell us what your business does.</h1>
                <p className="onboarding-lead">Who do you help, what do you sell, and how big is the team doing the work?</p>
                <WrittenAnswer
                  label="Business description"
                  value={business}
                  placeholder="We run a 12-person property management company. We look after 80 rental homes for owners in Casablanca."
                  onChange={setBusiness}
                  onContinue={() => setStep(1)}
                />
              </>
            )}

            {step === 1 && (
              <>
                <p className="eyebrow">Follow the work</p>
                <h1>What work keeps repeating?</h1>
                <p className="onboarding-lead">Describe something your team handles again and again. Tell us how it works today.</p>
                <WrittenAnswer
                  label="Repetitive work"
                  value={repetitiveWork}
                  placeholder="Tenants email maintenance requests. Someone copies each request into a spreadsheet, finds a contractor, and sends status updates."
                  onChange={setRepetitiveWork}
                  onContinue={() => setStep(2)}
                />
              </>
            )}

            {step === 2 && (
              <>
                <p className="eyebrow">Find the friction</p>
                <h1>Where does it slow down or go wrong?</h1>
                <p className="onboarding-lead">Mention waiting, copy-paste work, lost handoffs, mistakes, or anything people complain about.</p>
                <WrittenAnswer
                  label="Workflow bottleneck"
                  value={bottleneck}
                  placeholder="Requests get lost in the inbox. Owners wait for approval, and tenants have no idea when someone is coming."
                  onChange={setBottleneck}
                  onContinue={() => setStep(3)}
                />
              </>
            )}

            {step > 0 && <button type="button" className="onboarding-back" onClick={() => setStep(step - 1)}>← Back</button>}
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-card onboarding-results">
            <p className="eyebrow">Your automation shortlist</p>
            <h1>Start with one process.</h1>
            <p className="onboarding-lead">We used your description to find a useful first automation.</p>

            <dl className="discovery-summary">
              <div><dt>Your business</dt><dd>{business}</dd></div>
              <div><dt>Repeated work</dt><dd>{repetitiveWork}</dd></div>
              <div><dt>Main friction</dt><dd>{bottleneck}</dd></div>
            </dl>

            <div className="automation-shortlist">
              <article className="automation-idea discovered-idea">
                <span>Identified opportunity</span>
                <h2>{discoveredOpportunity.title}</h2>
                <p>{discoveredOpportunity.description}</p>
                <small>Saved for a future workflow template</small>
              </article>

              <article className="automation-idea runnable-idea">
                <span>Runnable in this demo</span>
                <h2>Expense approvals</h2>
                <p>Collect receipts, read key fields, enforce a $500 policy, and record the manager decision.</p>
                <div className="idea-flow">Receipt <b>→</b> Extract <b>→</b> Policy <b>→</b> Approval</div>
                <button type="button" onClick={() => onBuild(expensePrompt)}>Build this workflow</button>
              </article>
            </div>

            <button type="button" className="onboarding-back" onClick={() => setStep(2)}>← Change answers</button>
          </div>
        )}
      </section>
    </main>
  );
}
