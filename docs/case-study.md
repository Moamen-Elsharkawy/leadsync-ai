# Case Study

## SmartFlow Physical Therapy Intake System

SmartFlow is a reusable AI intake and lead management engine, specialized in this repository for physical therapy centers. It can be presented as a client-ready system for clinics and therapy centers that receive repetitive customer inquiries through messaging channels.

## Problem

Physical therapy centers often receive Telegram or chat inquiries asking about branches, prices, appointments, home visits, post-surgery rehabilitation, sports injuries, and general details. Managers need a simple way to see which inquiries are urgent, which branch is most requested, and which customers need follow-up.

## Solution

SmartFlow uses a Telegram bot to collect intake information in Arabic and stores all CRM data in Google Sheets through Apps Script. The manager uses a clean dashboard to review leads, conversations, follow-ups, reports, and system health.

## Why This Architecture

- Telegram is easy for customers.
- Google Sheets is familiar for small businesses.
- Apps Script avoids Google Cloud and service account setup.
- OpenRouter keeps the AI model configurable.
- No database keeps deployment and maintenance simple.

## Safety

The AI assistant does not diagnose, provide treatment advice, recommend exercises or medication, estimate session counts, promise outcomes, quote final prices, or confirm appointments before staff review. It collects intake details and routes the lead to the team.

## Demo Business

MoveWell Physical Therapy Centers:

- Nasr City Branch
- Maadi Branch
- New Cairo Branch

Demo services include back pain physiotherapy, neck pain physiotherapy, sports injury rehabilitation, post-surgery rehabilitation, knee pain treatment, shoulder rehabilitation, home physiotherapy, pediatric consultation, posture correction, and manual therapy inquiry.

## Business Value

- Faster response to inbound inquiries.
- Better lead prioritization.
- Centralized Google Sheets CRM.
- Conversation history for staff review.
- Follow-up queue for Warm or incomplete inquiries.
- Dashboard analytics for branch demand and service mix.
