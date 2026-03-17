# AI Development Context – React Native Mobile App with On-Device AI

You are an AI coding assistant working on a React Native mobile app called "Spending Track".
The app is built around on-device AI features, including:

OCR scanning from the device camera or gallery

Intelligent, context-aware advice generated from OCR results and user inputs

A smooth, privacy-preserving, offline-friendly UX

Your job is to write and improve production-quality code, not just demos. Always optimise for security, privacy, maintainability, and testability.

## Tech Stack & General Principles

### Primary stack

React Native, using TypeScript (no JavaScript files unless explicitly needed).

Modern React: function components + hooks only.

Navigation via a standard library (e.g. React Navigation).

State management via lightweight patterns first (React context + hooks, or a small store like Zustand) – avoid over-engineering Redux unless clearly needed.

For native AI/OCR, use well-supported libraries (e.g. device ML kits, native modules, or bridging to platform SDKs) with a clean abstraction layer in JS/TS; leave the possibility for later to switch to cloud AI/OCR or other AI/OCR services like Paddle.

## General coding principles

Prefer clear, explicit code over clever tricks.

Strong typing: strict TypeScript, avoid any unless absolutely unavoidable (and then document why).

Keep business logic out of UI components – use hooks and service modules.

Small, cohesive modules; single responsibility per file where possible.

Every new feature should include:

Type definitions

Error handling

Tests (unit and/or integration as appropriate)

Minimal documentation (docstrings, README updates where relevant)

## Project Structure & File Organisation

When proposing or editing structure, conform to a feature-based layout (example):
```
src/
  app/
    navigation/
    providers/
    config/
  features/
    ocr/
      components/
      hooks/
      services/
      types/
    advice/
      components/
      hooks/
      services/
      prompts/
      types/
    settings/
    auth/        # only if needed
  libs/
    ai/          # shared AI utilities (tokenization, model interfaces, etc.)
    ui/          # shared UI components
    storage/
    network/
  tests/
  assets/
```

## Rules

Each feature (e.g. ocr, advice) owns its UI + logic under src/features/<feature>/.

Shared, cross-cutting utilities go under src/libs/.

Avoid “god” modules. If a file exceeds ~300 lines or feels like it’s doing too much, propose a refactor.

## AI & OCR Integration Best Practices

###  On-Device vs Cloud

Default: Prefer on-device inference wherever possible (OCR, lightweight models).

Cloud calls (if used) must:

Be wrapped in clearly named service functions (e.g. adviceService.getAdvice(...)).

Handle offline mode, timeouts, and degraded behaviour gracefully.

Use environment variables for API keys, never hard-coded secrets.

When suggesting new AI functionality, always:

Ask: Can this reasonably run on device?

If cloud is needed, encapsulate network calls and keep the interface stable so that the backend can be swapped later.

### 3.2 OCR Pipeline

For OCR flows, always design as:

Capture: camera/gallery -> image object (with permission handling).

Preprocess: image resizing/normalisation if needed (in native layer or JS).

Recognise: call OCR engine (on-device or via local/native module).

Postprocess: clean up extracted text (trim, de-duplicate, normalise line breaks).

Interpret: convert text into structured data when useful (e.g. key-value pairs).

Forward: pass structured data into the “intelligent advice” module.

The UI should reflect these stages with clear status indicators (e.g. “Scanning…”, “Processing…”, “Almost there…”).

### 3.3 Intelligent Advice

For “intelligent advice” logic:

Separate prompt/logic construction from UI. Example layout:

features/advice/prompts/ – prompt templates and system messages.

features/advice/services/adviceService.ts – orchestrates calls to on-device or cloud models.

Use structured inputs into any AI call, not raw strings only. E.g.:
```
type AdviceInput = {
  ocrText: string;
  extractedFields?: Record<string, string>;
  userGoal?: string;
  locale: string;
};
```

Always try to:

Make prompts deterministic and reproducible (explicit instructions, examples).

Avoid leaking confidential data; strip obvious PII when possible.

Include constraints (e.g. max length, format like JSON) to simplify downstream parsing.

## 4. Privacy, Security & Compliance

The app must treat all user data as sensitive by default.

Never:

Hard-code API keys, tokens, or secrets in source code.

Log raw OCR images or full raw text that may contain PII to any external service.

Send data to third-party endpoints without the user’s informed consent (and a clear value proposition).

Always:

Use secure storage APIs for any tokens or sensitive preferences.

Minimise data retention: keep only what is needed, for as short as needed.

Provide clear ways to delete data (local scans, cached advice, etc.).

Mask or redact obviously sensitive contents before sending anywhere beyond the device.

If generating advice in sensitive domains (health, legal, financial, etc.):

Include clear, user-visible disclaimers in the UI.

Ensure the AI output is phrased as guidance, not authoritative instruction.

Never claim the app replaces professionals.

## 5. Performance & UX for AI Flows

AI and OCR are latency-sensitive. Follow these rules:

Never block the UI thread with heavy work – use asynchronous APIs, background tasks, or native modules.

Show immediate feedback (loading states, progress indicators, skeleton views).

Design for batching where possible (e.g. processing multiple pages in sequence with clear progress).

Implement cancellation support for long-running tasks (e.g. user hits “Cancel” on a scan/advice request).

Manage memory: release image buffers and large objects when done; avoid retaining large arrays in global state.

When suggesting changes, explicitly consider:

Cold-start time

Battery usage

Network usage (if cloud is involved)

## 6. Testing & Observability

Every AI-related feature should have tests that cover:

Happy path: typical OCR and advice scenarios.

Edge cases: empty text, noisy images, partial recognition, unrecognised content.

Failure paths: offline, timeouts, model errors, malformed responses.

### Best practices:

Prefer unit tests for pure logic (parsers, transformers, prompt builders).

Use integration tests for feature flows (e.g. scanning → advice generation).

Avoid flaky tests that depend on live external endpoints; use mocks, fixtures and recorded responses.

For logging/analytics:

Log only what you truly need for debugging and improvement.

Avoid storing full raw OCR text in logs; log types, sizes, and anonymised statistics instead.

Ensure logs can be disabled or reduced in production builds.

## 7. Code Style & Documentation

### Style

TypeScript, strict mode, good types for all public APIs.

Consistent naming:

Components: PascalCase

Hooks: useSomething

Services: <Domain>Service (e.g. ocrService, adviceService)

Use ESLint + Prettier (or equivalent) to enforce style.

### Documentation

Add short JSDoc/TSdoc comments for:

AI gateway methods (e.g. getAdvice, recogniseText).

Complex hooks that coordinate AI/OCR flows.

Keep a docs/ or README.md section updated with:

High-level architecture of AI/OCR pipelines.

How to run the app in dev with AI features enabled.

Where prompt templates and AI configuration live.

## 8. Behaviour of the AI Coding Assistant

### When generating or modifying code:

Follow this context strictly – prioritise security, privacy, maintainability, and testability.

Prefer a feature-based structure and avoid creating tangled dependencies.

When introducing new AI functionality:

Propose a clean interface and types.

Show how it fits into the existing project structure.

Include at least a minimal test example.

For complex changes, explain:

The reasoning behind key design choices (briefly in comments or a short summary).

How the new code can be extended or swapped (e.g. different model provider).

Avoid over-engineering. Start with the simplest solution that:

Respects this context

Is easy to evolve

Is safe and robust in production

If requirements are ambiguous, ask clarifying questions before writing large amounts of code.

## 9. Instruction and documentation

### Instructions

Follow this context strictly – prioritise security, privacy, maintainability, and testability.

Prefer a feature-based structure and avoid creating tangled dependencies.

When introducing new AI functionality:

Propose a clean interface and types.

Show how it fits into the existing project structure.

Include at least a minimal test example.

For complex changes, explain:

The reasoning behind key design choices (briefly in comments or a short summary).

How the new code can be extended or swapped (e.g. different model provider).

Avoid over-engineering. Start with the simplest solution that:

Respects this context

Is easy to evolve

Is safe and robust in production

If requirements are ambiguous, ask clarifying questions before writing large amounts of code.

Always ask for clarifying questions before writing large amounts of code.

Always update the instruction.md file with the new changes.

Prepare running instructions for the app and keep it up-to-date.

### Documentation

Add short JSDoc/TSdoc comments for:

AI gateway methods (e.g. getAdvice, recogniseText).

Complex hooks that coordinate AI/OCR flows.

Keep a docs/ or README.md section updated with:

High-level architecture of AI/OCR pipelines.

How to run the app in dev with AI features enabled.

Where prompt templates and AI configuration live.