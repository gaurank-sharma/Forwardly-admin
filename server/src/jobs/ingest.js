import DayConfig from "../models/DayConfig.js";
import Lead from "../models/Lead.js";
import IngestRun from "../models/IngestRun.js";
import { harvestLeads } from "../services/google.js";
import { classify } from "../services/classify.js";
import { generateResearch } from "../services/research.js";
import { assignHotLeads, hotLeadTarget } from "../services/assign.js";
import { ymd, weekdayOf } from "../services/util.js";

/**
 * Nightly DAG: for today's weekday configs, harvest REAL leads (widening the
 * Google search until ≥ (active agents x 10) website-less businesses are found),
 * classify, generate pitch + PDF for hot leads, dedup-insert, then auto-assign
 * hot leads. No fabricated/sample leads. Idempotent via placeId dedup.
 */
export async function runIngest({ date = new Date() } = {}) {
  const dateStr = ymd(date);
  const weekday = weekdayOf(date);
  const configs = await DayConfig.find({ weekday, active: true });
  const minHot = await hotLeadTarget();

  const run = await IngestRun.create({
    date: dateStr,
    weekday,
    configs: configs.map((c) => ({ pincode: c.pincode, industry: c.industry, city: c.city })),
  });

  let fetched = 0, newLeads = 0, duplicates = 0, hot = 0, medium = 0, cold = 0, source = "mock";
  const hotDocs = [];

  try {
    for (const cfg of configs) {
      const res = await harvestLeads(
        { pincode: cfg.pincode, city: cfg.city, industry: cfg.industry, keyword: cfg.keyword },
        minHot
      );
      source = res.source;
      fetched += res.leads.length;

      for (const raw of res.leads) {
        if (await Lead.exists({ placeId: raw.placeId })) { duplicates += 1; continue; }
        const cls = classify(raw);
        const doc = { ...raw, ...cls, status: "new", sourceDate: dateStr, ingestRunId: run._id };
        if (cls.classification !== "cold") doc.research = generateResearch({ ...raw, ...cls });
        const lead = await Lead.create(doc);
        newLeads += 1;
        if (cls.classification === "hot") { hot += 1; hotDocs.push(lead); }
        else if (cls.classification === "medium") medium += 1;
        else cold += 1;
      }
    }

    // (pitch PDFs are generated on-demand via GET /leads/:id/report.pdf)

    if (hot < minHot) {
      console.warn(`[ingest ${dateStr}] only ${hot} real hot leads found (target ${minHot}). ` +
        `Widen the day plan (more pincodes / website-less-prone industries).`);
    }

    const { assigned, perAgent } = await assignHotLeads(dateStr);

    run.set({ source, fetched, newLeads, duplicates, hot, medium, cold, assigned, perAgent, finishedAt: new Date(), ok: true });
    await run.save();
    console.log(`[ingest ${dateStr}] source=${source} fetched=${fetched} new=${newLeads} dup=${duplicates} hot=${hot} assigned=${assigned}`);
    return run;
  } catch (e) {
    run.set({ ok: false, error: e.message, finishedAt: new Date() });
    await run.save();
    console.error("[ingest] failed:", e);
    throw e;
  }
}
