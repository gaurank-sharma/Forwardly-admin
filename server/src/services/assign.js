import User from "../models/User.js";
import Lead from "../models/Lead.js";
import { config } from "../config.js";
import { ymd } from "./util.js";

const HOT_LEADS_PER_AGENT = Number(process.env.HOT_LEADS_PER_AGENT || 10);

/**
 * How many hot leads the nightly ingest should aim for today: active agents x
 * HOT_LEADS_PER_AGENT (default 10), so every on-duty agent gets a full quota.
 * Falls back to config.minHot when there are no active agents yet.
 */
export async function hotLeadTarget() {
  const activeAgents = await User.countDocuments({ role: "agent", active: true });
  return activeAgents > 0 ? activeAgents * HOT_LEADS_PER_AGENT : config.minHot;
}

/**
 * Assign unassigned HOT leads to ON-duty agents, round-robin, respecting the
 * daily cap. Medium/cold are never assigned. A lead already assigned stays put
 * (no repeats). Returns { assigned, perAgent }.
 */
export async function assignHotLeads(dateStr = ymd()) {
  const agents = await User.find({ role: "agent", active: true }).sort({ createdAt: 1 });
  if (!agents.length) return { assigned: 0, perAgent: {}, reason: "no active agents" };

  // remaining capacity per agent for the day
  const remaining = {};
  for (const a of agents) {
    const used = await Lead.countDocuments({ assignedTo: a._id, assignedDate: dateStr });
    remaining[a._id] = Math.max(0, config.dailyCap - used);
  }

  const pool = await Lead.find({
    classification: "hot",
    assignedTo: null,
    rejected: false,
  }).sort({ createdAt: 1 });

  const perAgent = {};
  let assigned = 0;
  let idx = 0;
  const n = agents.length;

  for (const lead of pool) {
    // find next agent (from idx) that still has capacity
    let picked = null;
    for (let step = 0; step < n; step++) {
      const a = agents[(idx + step) % n];
      if (remaining[a._id] > 0) {
        picked = a;
        idx = (idx + step + 1) % n;
        break;
      }
    }
    if (!picked) break; // everyone is full

    lead.assignedTo = picked._id;
    lead.assignedToName = picked.name;
    lead.assignedAt = new Date();
    lead.assignedDate = dateStr;
    lead.status = "assigned";
    lead.activities.push({
      at: new Date(),
      type: "assign",
      note: `Auto-assigned to ${picked.name}`,
    });
    await lead.save();

    remaining[picked._id] -= 1;
    perAgent[picked.name] = (perAgent[picked.name] || 0) + 1;
    assigned += 1;
  }

  return { assigned, perAgent };
}
