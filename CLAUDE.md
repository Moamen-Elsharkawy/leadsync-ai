# SmartFlow AI - Project Architecture & WAT Framework

SmartFlow is an AI-powered physical therapy center intake and lead management system. It operates under the **WAT framework** (Workflows, Agents, Tools), separating probabilistic AI reasoning from deterministic execution.

## The WAT Architecture in SmartFlow

**Layer 1: Workflows (The Flows)**
- Defined in the chatbot session state machine (`SessionService`) and conversation policies.
- **Conversation Stages**:
  - `greeting`: Initial contact, detects greetings, flood protection.
  - `qualifying`: Sequentially asking for `serviceRequested`, `fullName`, `branch`, `timeline`, `phone`. Tracking question ask counts for softer repeated requests.
  - `qualified`: All required data collected, ready for reception team review.

**Layer 2: Agents (The AI Logic)**
- **LeadExtractor**: Uses OpenRouter (Gemini) to extract structured data incrementally from conversation history.
- **LeadClassifier**: Scores and categorizes leads (Hot, Warm, Cold).
- **ReplyGenerator**: Generates context-aware, constrained Arabic responses based on current qualification stage.

**Layer 3: Tools (The Execution)**
- **SheetsWebAppClient**: Single source of truth for all data persistence via Google Apps Script (No traditional databases).
- **Telegraf Bot**: Handles Telegram polling and message delivery.
- **Next.js Dashboard**: The production manager interface for reviewing and managing leads.

## Constraints & Rules

1. **No direct database**: All data must route through the Google Sheets Web App.
2. **Strict Medical Safety**: The AI must *never* diagnose, prescribe, recommend exercises, quote final prices, or guarantee outcomes.
3. **Arabic Only**: All customer-facing messages must be in warm, professional Egyptian Arabic.
4. **No Demo Artifacts**: The system is in production. Do not reintroduce demo modes, system health endpoints, or mock data generators.

## Dashboard Architecture

The Next.js dashboard provides a professional interface for managers:
- `/overview`: Key metrics and intake summary (Total, Hot, Warm, Cold, Pending Follow-ups).
- `/leads`: Main intake pipeline with sorting, searching, and filtering.
- `/leads/[id]`: Detailed lead view for human-in-the-loop review.
- `/conversations`: Direct view of Telegram chats.
- `/follow-ups`: Management of scheduled automated and manual follow-ups.
- `/reports`: Exportable business metrics.
- `/business-settings`: Center configuration view.

## Core Directives

- When modifying the bot flow, always respect the state machine (`SessionStep`).
- When modifying extraction, prioritize cumulative context over single-message interpretation.
- When updating the dashboard, maintain the premium, Tailwind-based design aesthetic with proper dark sidebar and teal accents.
