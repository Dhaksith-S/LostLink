import assert from "node:assert/strict";
import test from "node:test";
import {
  claimRequestCopy,
  newReportCopy,
  TOPIC_ALL_REPORTS,
} from "../src/lib/notify-messages";

test("the broadcast topic matches the Android PushRegistrar", () => {
  assert.equal(TOPIC_ALL_REPORTS, "all_reports");
});

test("new report copy distinguishes lost from found and names the category", () => {
  const found = newReportCopy({ reportType: "found", category: "Electronics" });
  assert.equal(found.title, "New found item posted");
  assert.ok(found.body.startsWith("Found: Electronics."));

  const lost = newReportCopy({ reportType: "lost", category: "Wallet" });
  assert.equal(lost.title, "New lost item reported");
  assert.ok(lost.body.startsWith("Lost: Wallet."));
});

test("new report copy tolerates casing and falls back for missing fields", () => {
  assert.equal(
    newReportCopy({ reportType: "LOST" }).title,
    "New lost item reported",
  );
  // An unknown or absent type is treated as "found" rather than failing.
  assert.equal(newReportCopy({}).title, "New found item posted");
  assert.ok(
    newReportCopy({ reportType: "found" }).body.includes("Found: item."),
  );
  assert.ok(
    newReportCopy({ reportType: "found", category: "   " }).body.includes(
      "item.",
    ),
    "a blank category must not leave a dangling colon",
  );
});

test("claim copy is positive only for an explicit correct result", () => {
  const correct = claimRequestCopy({ result: "correct", itemCategory: "Keys" });
  assert.equal(correct.body, "Someone verified your Keys report!");

  const incorrect = claimRequestCopy({
    result: "incorrect",
    itemCategory: "Keys",
  });
  assert.equal(incorrect.body, "Someone attempted to claim your Keys report");

  // Anything unexpected must not claim the item was verified.
  for (const result of [undefined, "", "CORRECTLY", "maybe", 1]) {
    assert.equal(
      claimRequestCopy({ result, itemCategory: "Keys" }).body,
      "Someone attempted to claim your Keys report",
      `result ${JSON.stringify(result)} must not read as verified`,
    );
  }
  assert.equal(
    claimRequestCopy({ result: "CORRECT", itemCategory: "Keys" }).body,
    "Someone verified your Keys report!",
  );
});

test("claim copy falls back to a neutral noun when the category is missing", () => {
  assert.equal(
    claimRequestCopy({ result: "correct" }).body,
    "Someone verified your item report!",
  );
});
