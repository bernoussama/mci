import { useState } from "react";

type BusinessOnboardingProps = {
  onBuild(prompt: string): void;
  onSkip(): void;
};

type Answer = {
  id: string;
  label: string;
  detail: string;
};

const businessTypes: Answer[] = [
  { id: "software", label: "Software", detail: "SaaS, apps, and technology services" },
  { id: "services", label: "Professional services", detail: "Agencies, consulting, and legal work" },
  { id: "commerce", label: "Commerce", detail: "Retail, ecommerce, and distribution" },
  { id: "nonprofit", label: "Nonprofit", detail: "Associations, charities, and community teams" },
];

const teamSizes: Answer[] = [
  { id: "small", label: "1-10 people", detail: "A small team wearing several hats" },
  { id: "growing", label: "11-50 people", detail: "A growing team adding process" },
  { id: "established", label: "51+ people", detail: "Several teams and approval layers" },
];

const bottlenecks: Answer[] = [
  { id: "approvals", label: "Approvals wait too long", detail: "Requests sit in chat or email" },
  { id: "data-entry", label: "People retype information", detail: "Documents and forms create copy-paste work" },
  { id: "handoffs", label: "Customer handoffs get lost", detail: "Ownership is unclear between teams" },
  { id: "reporting", label: "Reports take hours", detail: "Updates are collected and formatted by hand" },
];

const opportunityByBottleneck: Record<string, { title: string; description: string }> = {
  approvals: { title: "Purchase request routing", description: "Collect requests, apply policy, and route exceptions to the right owner." },
  "data-entry": { title: "Document data capture", description: "Extract structured fields from documents before a person reviews them." },
  handoffs: { title: "Customer request triage", description: "Classify incoming requests and assign an accountable owner." },
  reporting: { title: "Recurring report assembly", description: "Gather team updates and produce a consistent report." },
};

function OptionList({ options, onChoose }: { options: Answer[]; onChoose(answer: Answer): void }) {
  return (
    <div className="onboarding-options">
      {options.map((option) => (
        <button key={option.id} type="button" className="onboarding-option" onClick={() => onChoose(option)}>
          <strong>{option.label}</strong>
          <span>{option.detail}</span>
        </button>
      ))}
    </div>
  );
}

export function BusinessOnboarding({ onBuild, onSkip }: BusinessOnboardingProps) {
  const [step, setStep] = useState(0);
  const [business, setBusiness] = useState<Answer | null>(null);
  const [teamSize, setTeamSize] = useState<Answer | null>(null);
  const [bottleneck, setBottleneck] = useState<Answer | null>(null);

  function chooseBusiness(answer: Answer) {
    setBusiness(answer);
    setStep(1);
  }

  function chooseTeamSize(answer: Answer) {
    setTeamSize(answer);
    setStep(2);
  }

  function chooseBottleneck(answer: Answer) {
    setBottleneck(answer);
    setStep(3);
  }

  const expensePrompt = `Build an expense approval workflow for a ${business?.label.toLowerCase() ?? "growing"} business with ${teamSize?.label.toLowerCase() ?? "a small team"}. Employees submit a receipt. Read the merchant and amount. Expenses above $500 need manager approval.`;
  const discoveredOpportunity = bottleneck ? opportunityByBottleneck[bottleneck.id] : null;

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
                <h1>What kind of business do you run?</h1>
                <p className="onboarding-lead">This helps MCI suggest work that is worth automating first.</p>
                <OptionList options={businessTypes} onChoose={chooseBusiness} />
              </>
            )}

            {step === 1 && (
              <>
                <p className="eyebrow">Team shape</p>
                <h1>How many people handle the work?</h1>
                <p className="onboarding-lead">Team size changes where approvals and handoffs start to hurt.</p>
                <OptionList options={teamSizes} onChoose={chooseTeamSize} />
              </>
            )}

            {step === 2 && (
              <>
                <p className="eyebrow">Find the bottleneck</p>
                <h1>Where does work slow down most?</h1>
                <p className="onboarding-lead">Pick the problem your team complains about repeatedly.</p>
                <OptionList options={bottlenecks} onChoose={chooseBottleneck} />
              </>
            )}

            {step > 0 && <button type="button" className="onboarding-back" onClick={() => setStep(step - 1)}>← Back</button>}
          </div>
        )}

        {step === 3 && discoveredOpportunity && (
          <div className="onboarding-card onboarding-results">
            <p className="eyebrow">Your automation shortlist</p>
            <h1>Start with one process.</h1>
            <p className="onboarding-lead">Based on a {business?.label.toLowerCase()} team of {teamSize?.label.toLowerCase()}, these are worth investigating.</p>

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
