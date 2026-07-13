import { config, assertConfig, canPushLive } from "./config.js";
import { searchMembers, resolveUuid, fetchProfile } from "./httpClient.js";
import { buildRow, CSV_COLUMNS } from "./mapProfile.js";
import { CsvWriter } from "./csvWriter.js";
import { loadState, saveState } from "./state.js";
import { randomDelay } from "./utils.js";
import { TokenExpiredError } from "./utils.js";
import { pushRowLive } from "./pushLive.js";
import fs from "fs";
import path from "path";

const isTest = process.argv.includes("--test");

function logError(message) {
  fs.mkdirSync(path.dirname(config.errorLogFile), { recursive: true });
  fs.appendFileSync(config.errorLogFile, `[${new Date().toISOString()}] ${message}\n`);
  console.error(message);
}

async function processLead(industry, searchResult, processedUserIds) {
  if (processedUserIds.has(searchResult.user_id)) return null;

  const uuId = await resolveUuid(searchResult.user_id);
  await randomDelay(config.delayMinMs, config.delayMaxMs);

  const profile = await fetchProfile(uuId);
  await randomDelay(config.delayMinMs, config.delayMaxMs);

  return buildRow({ industry, searchResult, uuId, profile });
}

async function runTest() {
  assertConfig();
  const industry = config.industries[0];
  console.log(`[test] searching "${industry}", page 1...`);
  const page = await searchMembers(industry, 1);
  const first = page?.search_results?.[0];
  if (!first) {
    console.error("[test] search returned no results — check BNI_SEARCH_TOKEN / BNI_BASE_URL");
    process.exit(1);
  }
  console.log(`[test] first result: ${first.first_name} ${first.last_name} (user_id=${first.user_id})`);

  const uuId = await resolveUuid(first.user_id);
  console.log(`[test] resolved uuId: ${uuId}`);

  const profile = await fetchProfile(uuId);
  console.log("[test] raw profile response:");
  console.log(JSON.stringify(profile, null, 2));

  const row = buildRow({ industry, searchResult: first, uuId, profile });
  console.log("\n[test] mapped row:");
  console.log(row);

  console.log(
    `\n[test] CHECK: displayName above should read "${first.first_name} ${first.last_name}" ` +
      "(the searched lead), not your own name. If phone_number/email_address are null, that's " +
      "expected for many members — BNI appears to gate full contact details behind an actual " +
      "connection rather than exposing them to anyone who can search. It is not a bug in this script."
  );
}

async function runFull() {
  assertConfig();
  console.log(
    canPushLive()
      ? `Live push enabled -> ${config.forwardlyApiUrl}/api/bni-leads/ingest`
      : "Live push disabled (set FORWARDLY_API_URL + FORWARDLY_INGEST_SECRET to enable)"
  );
  const csv = new CsvWriter(config.outputFile, CSV_COLUMNS);
  csv.init();

  const state = loadState(config.stateFile);
  const processedUserIds = new Set(state.processedUserIds);

  let stopped = false;
  process.on("SIGINT", () => {
    console.log("\nInterrupted — saving progress...");
    stopped = true;
  });

  for (const industry of config.industries) {
    if (stopped) break;
    const industryState = state.industries[industry] || { nextPage: 1, done: false };
    state.industries[industry] = industryState;

    if (industryState.done) {
      console.log(`[${industry}] already completed, skipping`);
      continue;
    }

    let page = industryState.nextPage;
    let totalPages = null;

    while (!stopped) {
      if (config.maxPagesPerIndustry && page > config.maxPagesPerIndustry) {
        console.log(`[${industry}] reached page cap (${config.maxPagesPerIndustry}), moving to next industry`);
        break;
      }
      console.log(`[${industry}] page ${page}${totalPages ? `/${totalPages}` : ""}`);
      let result;
      try {
        result = await searchMembers(industry, page);
      } catch (err) {
        if (err instanceof TokenExpiredError) {
          logError(`Search token expired: ${err.message}`);
          saveState(config.stateFile, state);
          process.exit(1);
        }
        logError(`Search failed for "${industry}" page ${page}: ${err.message}`);
        break;
      }

      totalPages = result.total_pages;
      const rows = result.search_results || [];
      if (rows.length === 0) break;

      for (const searchResult of rows) {
        if (stopped) break;
        if (processedUserIds.has(searchResult.user_id)) continue;

        try {
          const row = await processLead(industry, searchResult, processedUserIds);
          if (row) {
            csv.appendRow(row);
            processedUserIds.add(searchResult.user_id);
            state.processedUserIds = processedUserIds;
            saveState(config.stateFile, state);

            const pushResult = await pushRowLive(row);
            if (pushResult.ok === false) {
              logError(`Live push failed for user_id=${searchResult.user_id}: ${pushResult.error}`);
            }
          }
        } catch (err) {
          if (err instanceof TokenExpiredError) {
            logError(`Token/cookie expired while processing user_id=${searchResult.user_id}: ${err.message}`);
            saveState(config.stateFile, state);
            process.exit(1);
          }
          logError(`Failed lead user_id=${searchResult.user_id} (${industry}): ${err.message}`);
          // Not marked processed — will retry on next run.
        }
      }

      await randomDelay(config.delayMinMs, config.delayMaxMs);

      if (page >= totalPages) {
        industryState.done = true;
        saveState(config.stateFile, state);
        break;
      }

      page += 1;
      industryState.nextPage = page;
      saveState(config.stateFile, state);
    }
  }

  console.log(`\nDone. ${processedUserIds.size} leads written to ${config.outputFile}`);
  console.log(`Errors (if any) logged to ${config.errorLogFile}`);
  process.exit(0);
}

(isTest ? runTest() : runFull()).catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
