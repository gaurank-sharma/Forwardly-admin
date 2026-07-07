# Forwardly Leads — Day-wise Lead Gen + CRM Admin

An internal admin portal that runs a **nightly (3 AM) job** to pull fresh business
leads from Google (by the day's pincode + industry), classifies them, and
**auto-assigns only HOT leads** (businesses with **no website**) to available
agents — capped at **50/agent/day** with **no repeats** across days. Cold/medium
leads are shown but never assigned. Includes a full CRM to work each lead
(call, status, response, proof attachment, recall, reject) and a personalized
pitch + research per lead.

## Stack
- **Backend:** Node.js + Express.js + **MongoDB Atlas** (Mongoose)
- **Auth:** JWT + bcrypt (one super-admin; agents)
- **Jobs:** `node-cron` (3 AM daily DAG: ingest → classify → assign)
- **Leads source:** Google Places API (env key) with a realistic **mock fallback**
- **Research/pitch:** template engine + optional LLM hook
- **Frontend:** Vite + React + Tailwind + React Router

## Core rules (as specified)
- Day → pincode → industry map (e.g. Monday → Gurgaon pincode → Real Estate).
- **Hot** = no website → assignable. **Medium/Cold** = shown, not assigned.
- Round-robin to **ON** agents only; **OFF** agent gets nothing.
- Max **50/day/agent**; a lead is never re-assigned/duplicated on later days.
- Agents: **Gaurank Sharma, Vikas, Abhinav** (super-admin manages all).
- Working-days counter; per-agent on/off status visible.
- CRM per lead: click-to-call, status, reason/response, attachment (proof),
  needs-recall flag, reject (simple/proper with reason).

## Run
```bash
# 1) backend  — set MONGODB_URI (Atlas) in server/.env first
cd server && npm install && npm run seed && npm run dev   # http://localhost:5050

# 2) frontend (new terminal)
cd client && npm install && npm run dev                   # http://localhost:5173
```
Login: `admin@forwardly.in` / `admin123` (change in `.env`).

## Environment
Copy `server/.env.example` → `server/.env` and set:
- `MONGODB_URI` — your **MongoDB Atlas** connection string (required).
- `JWT_SECRET` — any long random string.
- `GOOGLE_MAPS_API_KEY` — enables live Google Places ingestion (else mock data).
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` — optional, enables AI research/pitch.
