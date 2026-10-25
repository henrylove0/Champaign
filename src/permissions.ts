import {
  campaignBudget,
  currentPerson,
  ownerId,
  paidAmount,
  platformFee,
} from "./model.ts";
import type { Activity, Campaign, Person } from "./model.ts";

// Prototype policy only. Production must apply the same checks before a server
// sends records; a local persona switch or hidden element is not authentication.
export const isCoordinator = (actorId: string) => actorId === ownerId;
export const canSeeCampaignFinance = (c: Campaign, actorId: string) =>
  isCoordinator(actorId) || currentPerson(c, actorId)?.role === "client";
export const canSeePersonalTerms = (
  c: Campaign,
  actorId: string,
  subjectId: string,
) =>
  !!currentPerson(c, actorId) &&
  (isCoordinator(actorId) || actorId === subjectId);
export const visiblePayees = (c: Campaign, actorId: string): Person[] =>
  isCoordinator(actorId)
    ? c.people.filter((p) => p.fee > 0)
    : c.people.filter((p) => p.id === actorId && p.fee > 0);
export const visibleActivities = (c: Campaign, actorId: string): Activity[] => {
  if (!currentPerson(c, actorId)) return [];
  if (isCoordinator(actorId)) return c.activity;
  return c.activity.filter((event) => {
    if (event.audience === "personal") return event.subjectId === actorId;
    // Older payment events have no visibility metadata. Treat them as private.
    if (event.kind === "payment" && !event.audience) return false;
    return event.audience !== "coordinator";
  });
};

export function campaignExport(c: Campaign, actorId: string) {
  const actor = currentPerson(c, actorId);
  if (!actor) throw new Error("Unknown participant");
  const people = c.people.map((p) => {
    const shared = {
      id: p.id,
      name: p.name,
      role: p.role,
      approvedRevision: p.approvedRevision,
      checkedIn: p.checkedIn,
      delivered: p.delivered,
      deliveryApproved: p.deliveryApproved,
    };
    return canSeePersonalTerms(c, actorId, p.id)
      ? {
          ...shared,
          fee: p.fee,
          approvedAt: p.approvedAt,
          sessionPaid: p.sessionPaid,
          deliveryPaid: p.deliveryPaid,
        }
      : shared;
  });
  const finance = canSeeCampaignFinance(c, actorId)
    ? {
        serviceBudget: campaignBudget(c),
        platformFee: platformFee(c),
        clientTotal: campaignBudget(c) + platformFee(c),
        simulatedFunding: c.funded ? campaignBudget(c) : 0,
        ...(isCoordinator(actorId) ? { simulatedPayouts: paidAmount(c) } : {}),
      }
    : {
        ownServiceFee: c.mode === "unpaid" ? 0 : actor.fee,
        ownSimulatedPayouts:
          (actor.sessionPaid ? actor.fee / 2 : 0) +
          (actor.deliveryPaid ? actor.fee / 2 : 0),
        fundingStatus: c.funded,
      };
  return {
    schema: 1,
    exportedAt: new Date().toISOString(),
    notice: "DEMO DATA — NO VERIFIED SIGNATURES OR PAYMENTS",
    exportView: isCoordinator(actorId)
      ? "coordinator"
      : actor.role === "client"
        ? "client"
        : "collaborator",
    viewer: actor.name,
    campaign: {
      id: c.id,
      title: c.title,
      client: c.client,
      goal: c.goal,
      date: c.date,
      location: c.location,
      address: c.address,
      timezone: c.timezone,
      revision: c.revision,
      mode: c.mode,
      usage: c.usage,
      term: c.term,
      territory: c.territory,
      aiAllowed: c.aiAllowed,
      cancellation: c.cancellation,
      funded: c.funded,
      sessionComplete: c.sessionComplete,
      people,
      schedule: c.schedule,
      activity: visibleActivities(c, actorId),
      finance,
    },
  };
}
