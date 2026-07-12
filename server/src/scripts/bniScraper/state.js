import fs from "fs";
import path from "path";

export function loadState(filePath) {
  if (!fs.existsSync(filePath)) {
    return { industries: {}, processedUserIds: [] };
  }
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return {
    industries: raw.industries || {},
    processedUserIds: raw.processedUserIds || [],
  };
}

export function saveState(filePath, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      { industries: state.industries, processedUserIds: [...state.processedUserIds] },
      null,
      2
    )
  );
}
