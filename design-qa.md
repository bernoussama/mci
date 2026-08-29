# Design QA

- Source visual truth: `/tmp/codex-clipboard-c3efda8d-e0d2-4a90-a198-40da1956fffd.png`
- Source dimensions: 750 x 412 pixels
- Intended implementation capture: `landing-implementation.png`
- Browser viewport: 1280 x 720 CSS pixels at device scale 1
- State: initial prompt screen, before workflow generation
- Browser evidence: the rendered DOM loaded, reported 1280 x 720 with no horizontal or vertical overflow, and exposed the expected prompt-first controls.
- Interaction evidence: the Vitest app journey covers prompt submission, the switch to the builder, form submission, approval, and accounting completion.

**Findings**

- [P1] Rendered screenshot unavailable
  Location: local in-app browser capture.
  Evidence: the source image opened successfully and the implementation DOM loaded, but repeated browser screenshot calls returned `Unable to capture screenshot`.
  Impact: typography, spacing, colors, asset quality, and overall visual fidelity cannot be compared from the same visual input.
  Fix: recapture the landing and builder screens when the browser capture channel is working, then compare them beside the source image.

**Required fidelity surfaces**

- Fonts and typography: blocked pending rendered capture.
- Spacing and layout rhythm: viewport geometry passed, visual comparison blocked.
- Colors and visual tokens: blocked pending rendered capture.
- Image quality and asset fidelity: the generated raster backdrop is present, visual comparison blocked.
- Copy and content: DOM inspection confirms the requested prompt-first story and builder labels.

**Comparison history**

- Initial pass: blocked because no browser-rendered screenshot could be captured. No visual fixes were claimed from incomplete evidence.

**Implementation checklist**

- Capture the initial prompt screen at 1280 x 720.
- Submit the prompt and capture the builder state at the same viewport.
- Compare both captures with the supplied reference and resolve any P0, P1, or P2 mismatch.

**Follow-up polish**

- Check the headline optical weight and prompt-card vertical position against the source once capture works.

final result: blocked
