import test from "node:test";
import assert from "node:assert/strict";
import {
  allApproved,
  approved,
  campaignBudget,
  createWorkspace,
  money,
  newCampaign,
  paidAmount,
  platformFee,
  releaseBlock,
  seedCampaign,
  transact,
} from "../src/model.ts";
import type { Action, BriefInput, Campaign } from "../src/model.ts";
import {
  campaignExport,
  canSeePersonalTerms,
  visibleActivities,
  visiblePayees,
} from "../src/permissions.ts";
import { agreement, callSheet } from "../src/documents.ts";

const input = (c: Campaign): BriefInput => ({
  title: c.title,
  client: c.client,
  goal: c.goal,
  date: c.date,
  location: c.location,
  address: c.address,
  mode: c.mode,
  usage: c.usage,
  term: c.term,
  territory: c.territory,
  aiAllowed: c.aiAllowed,
  cancellation: c.cancellation,
});
const run = (c: Campaign, actor: string, action: Action) => {
  const result = transact(c, actor, action);
  assert.equal(result.error, undefined);
  return result.campaign;
};
const aligned = () => run(seedCampaign(), "bia", { type: "approve" });
const funded = () => run(aligned(), "clara", { type: "fund" });
const wrapped = () => {
  let c = funded();
  for (const actor of ["naya", "rafa", "bia"])
    c = run(c, actor, { type: "checkIn" });
  return run(c, "naya", { type: "completeSession" });
};

test("collaborators see only their own commercial terms, even when another role is producer", () => {
  const c = seedCampaign();
  assert.equal(canSeePersonalTerms(c, "bia", "bia"), true);
  assert.equal(canSeePersonalTerms(c, "bia", "rafa"), false);
  assert.equal(canSeePersonalTerms(c, "clara", "rafa"), false);
  assert.equal(canSeePersonalTerms(c, "naya", "rafa"), true);
  const expanded = run(c, "naya", {
    type: "addPerson",
    name: "Test Producer",
    role: "producer",
    fee: 2000,
  });
  assert.equal(
    canSeePersonalTerms(expanded, expanded.people[4].id, "rafa"),
    false,
  );
});
test("collaborator exports omit everyone else’s fees, payments, and campaign totals", () => {
  const exported = campaignExport(funded(), "bia");
  assert.equal(exported.exportView, "collaborator");
  assert.equal(exported.campaign.finance.ownServiceFee, 1500);
  assert.equal(
    Object.hasOwn(exported.campaign.finance, "serviceBudget"),
    false,
  );
  assert.equal(
    Object.hasOwn(
      exported.campaign.people.find((p) => p.id === "rafa")!,
      "fee",
    ),
    false,
  );
  assert.equal(
    Object.hasOwn(
      exported.campaign.people.find((p) => p.id === "naya")!,
      "sessionPaid",
    ),
    false,
  );
  const own = exported.campaign.people.find((p) => p.id === "bia")!;
  assert.ok("fee" in own);
  assert.equal(own.fee, 1500);
  assert.throws(() => campaignExport(funded(), "stranger"));
});
test("client exports disclose the quote but not rates or incremental payout totals", () => {
  const c = run(wrapped(), "naya", {
    type: "release",
    personId: "rafa",
    milestone: "session",
  });
  const exported = campaignExport(c, "clara");
  assert.ok("clientTotal" in exported.campaign.finance);
  assert.equal(exported.campaign.finance.clientTotal, 10500);
  assert.equal(
    Object.hasOwn(exported.campaign.finance, "simulatedPayouts"),
    false,
  );
  assert.equal(
    Object.hasOwn(
      exported.campaign.people.find((p) => p.id === "rafa")!,
      "fee",
    ),
    false,
  );
  assert.deepEqual(visiblePayees(c, "clara"), []);
});
test("private payout activity is visible to the recipient and coordinator only", () => {
  const c = run(wrapped(), "naya", {
    type: "release",
    personId: "rafa",
    milestone: "session",
  });
  const eventId = c.activity[0].id;
  assert.equal(
    visibleActivities(c, "naya").some((a) => a.id === eventId),
    true,
  );
  assert.equal(
    visibleActivities(c, "rafa").some((a) => a.id === eventId),
    true,
  );
  assert.equal(
    visibleActivities(c, "bia").some((a) => a.id === eventId),
    false,
  );
  assert.equal(
    visibleActivities(c, "clara").some((a) => a.id === eventId),
    false,
  );
  assert.equal(visibleActivities(c, "stranger").length, 0);
  assert.deepEqual(
    visiblePayees(c, "bia").map((p) => p.id),
    ["bia"],
  );
});
test("personal document generation denies other participants and omits aggregate pricing", () => {
  const c = seedCampaign();
  const bia = c.people.find((p) => p.id === "bia")!;
  const own = agreement(c, bia, "en", "bia");
  assert.match(own, /R\$1,500/);
  assert.doesNotMatch(own, /R\$10,000|R\$5,000|R\$3,500|R\$500/);
  assert.match(agreement(c, bia, "en", "rafa"), /^Private agreement/);
  assert.match(agreement(c, bia, "pt", "clara"), /^Acordo privado/);
  assert.match(own, /not delivering edited campaign media/);
});
test("an AI request never silently becomes a likeness or training license", () => {
  const c = seedCampaign();
  c.aiAllowed = true;
  assert.match(
    agreement(c, c.people[0], "en", "naya"),
    /No AI permission is granted by this draft/,
  );
  assert.match(
    agreement(c, c.people[0], "pt", "naya"),
    /Esta minuta não concede permissão de IA/,
  );
  const sheet = callSheet(c, "pt");
  assert.match(sheet, /ORDEM DO DIA/);
  assert.doesNotMatch(sheet, /R\$/);
});
test("odd whole-real fees retain cent precision in splits and platform fees", () => {
  const c = seedCampaign();
  c.people[0].fee = 5001;
  assert.equal(platformFee(c), 500.05);
  assert.equal(money(2500.5, "en"), "R$2,500.50");
});

test("seed is a coherent Brazil campaign with one pending approval", () => {
  const w = createWorkspace();
  const c = w.campaigns[0];
  assert.equal(w.activeId, c.id);
  assert.equal(c.people.filter((p) => approved(c, p)).length, 3);
  assert.equal(campaignBudget(c), 10000);
  assert.equal(platformFee(c), 500);
  assert.equal(c.timezone, "America/Sao_Paulo");
});
test("funding requires every current approval, accepts client or coordinator, and is idempotent", () => {
  assert.equal(
    transact(seedCampaign(), "clara", { type: "fund" }).error,
    "approval",
  );
  assert.equal(transact(aligned(), "rafa", { type: "fund" }).error, "client");
  assert.equal(transact(funded(), "clara", { type: "fund" }).error, "already");
});
test("a changed usage scope invalidates every previous approval without mutating original data", () => {
  const before = aligned();
  const c = run(before, "naya", {
    type: "brief",
    input: { ...input(before), territory: "Worldwide" },
  });
  assert.equal(c.revision, 2);
  assert.equal(c.people.filter((p) => approved(c, p)).length, 0);
  assert.equal(before.revision, 1);
  assert.equal(allApproved(before), true);
  assert.match(c.activity[0].en, /Earlier approvals no longer apply/);
});
test("schedule changes require coordinator, version the plan, and sort by local time", () => {
  assert.equal(
    transact(seedCampaign(), "rafa", {
      type: "editSchedule",
      itemId: "light",
      time: "06:00",
    }).error,
    "owner",
  );
  const c = run(aligned(), "naya", {
    type: "editSchedule",
    itemId: "light",
    time: "06:00",
  });
  assert.equal(c.revision, 2);
  assert.equal(allApproved(c), false);
  assert.equal(c.schedule[0].id, "light");
  assert.equal(
    transact(c, "naya", {
      type: "editSchedule",
      itemId: "light",
      time: "26:00",
    }).error,
    "invalid",
  );
});
test("adding a role versions the budget and drafts new personal terms", () => {
  const c = run(aligned(), "naya", {
    type: "addPerson",
    name: "Ana Silva",
    role: "photographer",
    fee: 2000,
  });
  assert.equal(c.people.length, 5);
  assert.equal(c.revision, 2);
  assert.equal(campaignBudget(c), 12000);
  assert.equal(allApproved(c), false);
  assert.equal(c.people[4].approvedRevision, 0);
  assert.equal(
    transact(c, "naya", {
      type: "addPerson",
      name: "Invalid",
      role: "model",
      fee: -1,
    }).error,
    "invalid",
  );
});
test("funded or started scope cannot be silently edited or have its mode changed", () => {
  const c = funded();
  assert.equal(
    transact(c, "naya", {
      type: "brief",
      input: { ...input(c), mode: "unpaid" },
    }).error,
    "locked",
  );
  assert.equal(
    transact(c, "naya", {
      type: "addPerson",
      name: "Ana",
      role: "model",
      fee: 2,
    }).error,
    "locked",
  );
  assert.equal(
    transact(c, "naya", {
      type: "editSchedule",
      itemId: "light",
      time: "08:10",
    }).error,
    "locked",
  );
});
test("attendance requires approvals and funding; coordinator cannot wrap absent crew", () => {
  assert.equal(
    transact(aligned(), "rafa", { type: "checkIn" }).error,
    "approval",
  );
  assert.equal(
    transact(funded(), "naya", { type: "completeSession" }).error,
    "evidence",
  );
  assert.equal(
    transact(funded(), "rafa", { type: "completeSession" }).error,
    "owner",
  );
  const c = wrapped();
  assert.equal(c.sessionComplete, true);
  assert.equal(c.people.find((p) => p.id === "clara")?.checkedIn, false);
});
test("check-in alone cannot trigger a session payout", () => {
  const c = run(funded(), "rafa", { type: "checkIn" });
  assert.equal(releaseBlock(c, c.people[1], "session"), "evidence");
  assert.equal(
    transact(c, "clara", {
      type: "release",
      personId: "rafa",
      milestone: "session",
    }).error,
    "evidence",
  );
});
test("session payments require complete evidence and cannot be released twice", () => {
  const c = run(wrapped(), "clara", {
    type: "release",
    personId: "rafa",
    milestone: "session",
  });
  assert.equal(paidAmount(c), 1750);
  assert.equal(
    transact(c, "clara", {
      type: "release",
      personId: "rafa",
      milestone: "session",
    }).error,
    "already",
  );
});
test("final payment requires participant handover and independent client approval", () => {
  assert.equal(
    transact(funded(), "rafa", { type: "deliver" }).error,
    "evidence",
  );
  let c = run(wrapped(), "rafa", { type: "deliver" });
  assert.equal(
    transact(c, "naya", { type: "approveDelivery", personId: "rafa" }).error,
    "client",
  );
  assert.equal(releaseBlock(c, c.people[1], "delivery"), "evidence");
  c = run(c, "clara", { type: "approveDelivery", personId: "rafa" });
  c = run(c, "clara", {
    type: "release",
    personId: "rafa",
    milestone: "delivery",
  });
  assert.equal(paidAmount(c), 1750);
});
test("complete campaign releases exactly the service budget, never the platform fee", () => {
  let c = wrapped();
  for (const id of ["naya", "rafa", "bia"]) {
    c = run(c, id, { type: "deliver" });
    c = run(c, "clara", { type: "approveDelivery", personId: id });
    for (const milestone of ["session", "delivery"] as const)
      c = run(c, "clara", { type: "release", personId: id, milestone });
  }
  assert.equal(paidAmount(c), campaignBudget(c));
  assert.equal(platformFee(c), 500);
});
test("unpaid work zeroes service fees, retains approvals, and needs no funding", () => {
  const original = seedCampaign();
  let c = newCampaign({ ...input(original), mode: "unpaid" });
  assert.equal(campaignBudget(c), 0);
  assert.equal(platformFee(c), 0);
  for (const p of c.people) c = run(c, p.id, { type: "approve" });
  c = run(c, "naya", { type: "checkIn" });
  assert.equal(c.people[0].checkedIn, true);
  assert.equal(transact(c, "clara", { type: "fund" }).error, "mode");
});
test("external paid work keeps fees while rejecting platform funding and release", () => {
  let c = newCampaign({ ...input(seedCampaign()), mode: "external" });
  assert.equal(campaignBudget(c), 10000);
  assert.equal(platformFee(c), 0);
  for (const p of c.people) c = run(c, p.id, { type: "approve" });
  c = run(c, "naya", { type: "checkIn" });
  assert.equal(transact(c, "clara", { type: "fund" }).error, "mode");
  assert.equal(releaseBlock(c, c.people[0], "session"), "mode");
});
test("unknown actors and missing milestones do not mutate campaign state", () => {
  const c = funded();
  assert.equal(transact(c, "stranger", { type: "approve" }).error, "invalid");
  assert.equal(
    transact(c, "naya", { type: "schedule", itemId: "missing" }).error,
    "invalid",
  );
  assert.equal(c.activity.length, funded().activity.length);
});
