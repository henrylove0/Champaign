export type Language = "en" | "pt";
export type PaymentMode = "platform" | "external" | "unpaid";
export type Role =
  | "model"
  | "client"
  | "photographer"
  | "makeup"
  | "videographer"
  | "actor"
  | "stylist"
  | "producer";
export type Milestone = "session" | "delivery";
export type Person = {
  id: string;
  name: string;
  role: Role;
  initials: string;
  color: string;
  fee: number;
  approvedRevision: number;
  approvedAt?: string;
  checkedIn: boolean;
  delivered: boolean;
  deliveryApproved: boolean;
  sessionPaid: boolean;
  deliveryPaid: boolean;
};
export type ScheduleItem = {
  id: string;
  time: string;
  title: string;
  titlePt: string;
  owner: string;
  done: boolean;
};
export type Activity = {
  id: string;
  at: string;
  actor: string;
  en: string;
  pt: string;
  kind: "agreement" | "schedule" | "payment" | "campaign" | "delivery";
  audience?: "shared" | "personal" | "coordinator";
  subjectId?: string;
};
export type Campaign = {
  id: string;
  title: string;
  client: string;
  goal: string;
  date: string;
  location: string;
  address: string;
  timezone: string;
  revision: number;
  mode: PaymentMode;
  usage: string;
  term: string;
  territory: string;
  aiAllowed: boolean;
  cancellation: string;
  people: Person[];
  schedule: ScheduleItem[];
  funded: boolean;
  sessionComplete: boolean;
  activity: Activity[];
};
export type Workspace = {
  schema: 1;
  campaigns: Campaign[];
  activeId: string;
  actorId: string;
  language: Language;
};
export type BriefInput = Pick<
  Campaign,
  | "title"
  | "client"
  | "goal"
  | "date"
  | "location"
  | "address"
  | "mode"
  | "usage"
  | "term"
  | "territory"
  | "aiAllowed"
  | "cancellation"
>;
export type Action =
  | { type: "approve" }
  | { type: "checkIn" }
  | { type: "fund" }
  | { type: "completeSession" }
  | { type: "deliver" }
  | { type: "approveDelivery"; personId: string }
  | { type: "release"; personId: string; milestone: Milestone }
  | { type: "schedule"; itemId: string }
  | { type: "brief"; input: BriefInput }
  | { type: "addPerson"; name: string; role: Role; fee: number }
  | { type: "editSchedule"; itemId: string; time: string };
export type Result = {
  campaign: Campaign;
  error?:
    | "owner"
    | "approval"
    | "funding"
    | "evidence"
    | "already"
    | "mode"
    | "invalid"
    | "client"
    | "locked";
};

export const STORAGE_KEY = "champaign.workspace.v1";
export const feeRate = 0.05; // Illustrative platform fee, not provider pricing.
export const ownerId = "naya";
export const roleLabel: Record<Role, { en: string; pt: string }> = {
  model: { en: "Model", pt: "Modelo" },
  client: { en: "Client", pt: "Cliente" },
  photographer: { en: "Photographer", pt: "Fotógrafo(a)" },
  makeup: { en: "Hair & makeup", pt: "Cabelo e maquiagem" },
  videographer: { en: "Videographer", pt: "Videomaker" },
  actor: { en: "Actor", pt: "Ator / atriz" },
  stylist: { en: "Stylist", pt: "Stylist / figurino" },
  producer: { en: "Producer", pt: "Produção" },
};
export const now = () => new Date().toISOString();
export const uid = () => crypto.randomUUID();
export const money = (value: number, lang: Language = "en") =>
  new Intl.NumberFormat(lang === "en" ? "en-US" : "pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
export const dateLabel = (date: string, lang: Language = "en") =>
  new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
export const campaignBudget = (c: Campaign) =>
  c.mode === "unpaid" ? 0 : c.people.reduce((sum, p) => sum + p.fee, 0);
export const platformFee = (c: Campaign) =>
  c.mode === "platform"
    ? Math.round(campaignBudget(c) * feeRate * 100) / 100
    : 0;
export const approved = (c: Campaign, p: Person) =>
  p.approvedRevision === c.revision;
export const allApproved = (c: Campaign) =>
  c.people.every((p) => approved(c, p));
export const payees = (c: Campaign) => c.people.filter((p) => p.fee > 0);
export const paidAmount = (c: Campaign) =>
  payees(c).reduce(
    (sum, p) =>
      sum +
      (p.sessionPaid ? p.fee * 0.5 : 0) +
      (p.deliveryPaid ? p.fee * 0.5 : 0),
    0,
  );
export const currentPerson = (c: Campaign, actorId: string) =>
  c.people.find((p) => p.id === actorId);
export const ready = (c: Campaign) =>
  allApproved(c) && (c.mode !== "platform" || c.funded);
export function releaseBlock(
  c: Campaign,
  p: Person,
  milestone: Milestone,
): Result["error"] | undefined {
  if (c.mode !== "platform" || p.fee <= 0) return "mode";
  if (!c.funded) return "funding";
  if (!allApproved(c)) return "approval";
  if (milestone === "session" ? p.sessionPaid : p.deliveryPaid)
    return "already";
  if (
    milestone === "session"
      ? !p.checkedIn || !c.sessionComplete
      : !p.delivered || !p.deliveryApproved
  )
    return "evidence";
  return undefined;
}

function seedPeople(): Person[] {
  return [
    {
      id: "naya",
      name: "Naya Lima",
      role: "model",
      initials: "NL",
      color: "sage",
      fee: 5000,
      approvedRevision: 1,
    },
    {
      id: "rafa",
      name: "Rafa Costa",
      role: "photographer",
      initials: "RC",
      color: "sand",
      fee: 3500,
      approvedRevision: 1,
    },
    {
      id: "bia",
      name: "Bia Martins",
      role: "makeup",
      initials: "BM",
      color: "rose",
      fee: 1500,
      approvedRevision: 0,
    },
    {
      id: "clara",
      name: "Clara Alves",
      role: "client",
      initials: "CA",
      color: "blue",
      fee: 0,
      approvedRevision: 1,
    },
  ].map(
    (p) =>
      ({
        ...p,
        checkedIn: false,
        delivered: false,
        deliveryApproved: false,
        sessionPaid: false,
        deliveryPaid: false,
      }) as Person,
  );
}
export function seedCampaign(): Campaign {
  return {
    id: "mare-summer",
    title: "Summer, in good company.",
    client: "Maré Studio",
    goal: "A sunlit summer campaign: 12 edited photographs and 3 vertical films, made together in Rio. Natural movement, warm light, and a feeling of belonging.",
    date: "2026-11-12",
    location: "Casa Maré · Ipanema",
    address: "Rio de Janeiro, Brazil · sample location, confirm before travel",
    timezone: "America/Sao_Paulo",
    revision: 1,
    mode: "platform",
    usage:
      "Brand website, organic Instagram, and paid social. No resale, stock licensing, or transfer to other brands.",
    term: "6 months from first publication",
    territory: "Brazil",
    aiAllowed: false,
    cancellation:
      "More than 72 hours: no service cancellation fee. Within 72 hours: 50% of each agreed service fee. Documented non-refundable expenses require separate approval. Unsafe work may be paused and reviewed.",
    people: seedPeople(),
    funded: false,
    sessionComplete: false,
    schedule: [
      {
        id: "arrival",
        time: "06:30",
        title: "Crew arrival & welcome",
        titlePt: "Chegada e boas-vindas",
        owner: "naya",
        done: false,
      },
      {
        id: "beauty",
        time: "07:00",
        title: "Hair, makeup & wardrobe",
        titlePt: "Cabelo, maquiagem e figurino",
        owner: "bia",
        done: false,
      },
      {
        id: "light",
        time: "08:00",
        title: "Golden light · terrace",
        titlePt: "Luz dourada · terraço",
        owner: "rafa",
        done: false,
      },
      {
        id: "film",
        time: "10:00",
        title: "Motion & close-ups",
        titlePt: "Movimento e detalhes",
        owner: "rafa",
        done: false,
      },
      {
        id: "wrap",
        time: "12:00",
        title: "Wrap & client review",
        titlePt: "Encerramento e revisão",
        owner: "clara",
        done: false,
      },
    ],
    activity: [
      {
        id: "seed1",
        at: "2026-10-25T01:00:00Z",
        actor: "Naya Lima",
        en: "Created the campaign. Agreements and the call sheet were prepared automatically.",
        pt: "Criou a campanha. Acordos e ordem do dia foram preparados automaticamente.",
        kind: "campaign",
      },
      {
        id: "seed2",
        at: "2026-10-25T01:20:00Z",
        actor: "Rafa Costa",
        en: "Approved the brief, personal terms, and usage limits · version 1.",
        pt: "Aprovou o briefing, os termos individuais e os limites de uso · versão 1.",
        kind: "agreement",
      },
      {
        id: "seed3",
        at: "2026-10-25T01:30:00Z",
        actor: "Clara Alves",
        en: "Approved the campaign · version 1. Bia’s approval is still needed.",
        pt: "Aprovou a campanha · versão 1. Falta a aprovação de Bia.",
        kind: "agreement",
      },
    ],
  };
}
export const createWorkspace = (): Workspace => ({
  schema: 1,
  campaigns: [seedCampaign()],
  activeId: "mare-summer",
  actorId: "naya",
  language: "en",
});

export function transact(
  campaign: Campaign,
  actorId: string,
  action: Action,
): Result {
  const c = structuredClone(campaign);
  const person = currentPerson(c, actorId);
  if (!person) return { campaign, error: "invalid" };
  const isOwner = actorId === ownerId;
  const fail = (error: Result["error"]): Result => ({ campaign, error });
  const log = (
    en: string,
    pt: string,
    kind: Activity["kind"],
    audience: Activity["audience"] = "shared",
    subjectId?: string,
  ) =>
    c.activity.unshift({
      id: uid(),
      at: now(),
      actor: person.name,
      en,
      pt,
      kind,
      audience,
      subjectId,
    });
  const revise = () => {
    c.revision++;
    c.sessionComplete = false;
    c.people.forEach((p) => {
      p.checkedIn = false;
      p.delivered = false;
      p.deliveryApproved = false;
    });
    c.schedule.forEach((i) => (i.done = false));
  };
  switch (action.type) {
    case "approve":
      if (approved(c, person)) return fail("already");
      person.approvedRevision = c.revision;
      person.approvedAt = now();
      log(
        `Approved personal terms and campaign version ${c.revision}.`,
        `Aprovou os termos individuais e a versão ${c.revision} da campanha.`,
        "agreement",
      );
      if (allApproved(c))
        log(
          "Everyone has approved. The current agreements are aligned.",
          "Todos aprovaram. Os acordos atuais estão alinhados.",
          "agreement",
        );
      break;
    case "checkIn":
      if (!ready(c)) return fail("approval");
      if (person.checkedIn) return fail("already");
      person.checkedIn = true;
      log(
        "Confirmed arrival (demo check-in).",
        "Confirmou a chegada (check-in demonstrativo).",
        "schedule",
      );
      break;
    case "fund":
      if (!isOwner && person.role !== "client") return fail("client");
      if (c.mode !== "platform" || campaignBudget(c) <= 0) return fail("mode");
      if (!allApproved(c)) return fail("approval");
      if (c.funded) return fail("already");
      c.funded = true;
      log(
        "Simulated client funding. No payment was processed.",
        "Simulou o aporte do cliente. Nenhum pagamento foi processado.",
        "payment",
      );
      break;
    case "completeSession":
      if (!isOwner) return fail("owner");
      if (
        !ready(c) ||
        !c.people.filter((p) => p.role !== "client").every((p) => p.checkedIn)
      )
        return fail("evidence");
      if (c.sessionComplete) return fail("already");
      c.sessionComplete = true;
      log(
        "Confirmed the shoot was completed. Session milestones can now be reviewed.",
        "Confirmou a conclusão da sessão. As parcelas da sessão podem ser revisadas.",
        "schedule",
      );
      break;
    case "deliver":
      if (
        person.role === "client" ||
        !c.sessionComplete ||
        !approved(c, person)
      )
        return fail("evidence");
      if (person.delivered) return fail("already");
      person.delivered = true;
      log(
        "Submitted the agreed handover for client review.",
        "Enviou a entrega combinada para revisão do cliente.",
        "delivery",
      );
      break;
    case "approveDelivery": {
      if (person.role !== "client") return fail("client");
      const target = c.people.find((p) => p.id === action.personId);
      if (!allApproved(c)) return fail("approval");
      if (!target?.delivered) return fail("evidence");
      if (target.deliveryApproved) return fail("already");
      target.deliveryApproved = true;
      log(
        `Approved ${target.name}’s handover.`,
        `Aprovou a entrega de ${target.name}.`,
        "delivery",
      );
      break;
    }
    case "release": {
      if (!isOwner && person.role !== "client") return fail("client");
      const target = c.people.find((p) => p.id === action.personId);
      if (!target) return fail("invalid");
      const block = releaseBlock(c, target, action.milestone);
      if (block) return fail(block);
      if (action.milestone === "session") target.sessionPaid = true;
      else target.deliveryPaid = true;
      log(
        `Simulated ${action.milestone} payment to ${target.name}. No money moved.`,
        `Simulou o pagamento de ${action.milestone === "session" ? "sessão" : "entrega"} para ${target.name}. Nenhum valor foi transferido.`,
        "payment",
        "personal",
        target.id,
      );
      break;
    }
    case "schedule": {
      const item = c.schedule.find((i) => i.id === action.itemId);
      if (!item) return fail("invalid");
      if (!isOwner && item.owner !== actorId) return fail("owner");
      if (!ready(c)) return fail("approval");
      item.done = !item.done;
      log(
        `${item.done ? "Completed" : "Reopened"}: ${item.title}.`,
        `${item.done ? "Concluiu" : "Reabriu"}: ${item.titlePt}.`,
        "schedule",
      );
      break;
    }
    case "brief": {
      if (!isOwner) return fail("owner");
      if (c.funded || c.sessionComplete || c.people.some((p) => p.checkedIn))
        return fail("locked");
      if (
        !action.input.title.trim() ||
        !action.input.client.trim() ||
        !action.input.goal.trim() ||
        !action.input.location.trim() ||
        !action.input.usage.trim() ||
        !action.input.term.trim() ||
        !action.input.territory.trim() ||
        !action.input.cancellation.trim() ||
        !/^\d{4}-\d{2}-\d{2}$/.test(action.input.date) ||
        !Number.isFinite(Date.parse(`${action.input.date}T12:00:00Z`))
      )
        return fail("invalid");
      const changed = Object.entries(action.input).some(
        ([key, value]) => c[key as keyof Campaign] !== value,
      );
      if (!changed) return fail("already");
      Object.assign(c, action.input);
      if (c.mode === "unpaid")
        c.people.forEach((p) => {
          p.fee = 0;
        });
      revise();
      log(
        `Published version ${c.revision}. Earlier approvals no longer apply; agreements and the call sheet were regenerated.`,
        `Publicou a versão ${c.revision}. Aprovações anteriores perderam validade; acordos e ordem do dia foram atualizados.`,
        "campaign",
      );
      break;
    }
    case "addPerson": {
      if (!isOwner) return fail("owner");
      if (c.funded || c.sessionComplete || c.people.some((p) => p.checkedIn))
        return fail("locked");
      if (
        !action.name.trim() ||
        !Number.isInteger(action.fee) ||
        action.fee < 0 ||
        action.fee > 1000000 ||
        !Object.keys(roleLabel).includes(action.role) ||
        action.role === "client"
      )
        return fail("invalid");
      const name = action.name.trim();
      c.people.push({
        id: uid(),
        name,
        role: action.role,
        initials: name
          .split(/\s+/)
          .map((s) => s[0])
          .slice(0, 2)
          .join("")
          .toUpperCase(),
        color: "sand",
        fee: c.mode === "unpaid" ? 0 : action.fee,
        approvedRevision: 0,
        checkedIn: false,
        delivered: false,
        deliveryApproved: false,
        sessionPaid: false,
        deliveryPaid: false,
      });
      revise();
      log(
        `Added ${name}; prepared personal terms. Version ${c.revision} needs everyone’s approval.`,
        `Adicionou ${name}; preparou os termos individuais. A versão ${c.revision} precisa da aprovação de todos.`,
        "campaign",
      );
      break;
    }
    case "editSchedule": {
      if (!isOwner) return fail("owner");
      if (c.funded || c.sessionComplete || c.people.some((p) => p.checkedIn))
        return fail("locked");
      const item = c.schedule.find((i) => i.id === action.itemId);
      if (!item || !/^([01]\d|2[0-3]):[0-5]\d$/.test(action.time))
        return fail("invalid");
      if (item.time === action.time) return fail("already");
      item.time = action.time;
      c.schedule.sort((a, b) => a.time.localeCompare(b.time));
      revise();
      log(
        `Updated the call time; version ${c.revision} needs fresh approval.`,
        `Atualizou o horário; a versão ${c.revision} precisa de nova aprovação.`,
        "schedule",
      );
      break;
    }
  }
  return { campaign: c };
}

export function newCampaign(input: BriefInput): Campaign {
  const c = seedCampaign();
  Object.assign(c, input);
  c.id = uid();
  c.revision = 1;
  c.funded = false;
  c.activity = [];
  c.people.forEach((p) => {
    p.approvedRevision = 0;
    if (c.mode === "unpaid") p.fee = 0;
  });
  c.activity.push({
    id: uid(),
    at: now(),
    actor: "Naya Lima",
    en: "Created a campaign. Draft agreements, the call sheet, and payment milestones were prepared.",
    pt: "Criou uma campanha. Minutas, ordem do dia e parcelas foram preparados.",
    kind: "campaign",
  });
  return c;
}

export function loadWorkspace(): { workspace: Workspace; corrupt: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { workspace: createWorkspace(), corrupt: false };
    const w = JSON.parse(raw) as Workspace;
    if (
      w.schema !== 1 ||
      !Array.isArray(w.campaigns) ||
      !w.campaigns.length ||
      !["en", "pt"].includes(w.language) ||
      !w.campaigns.some((c) => c.id === w.activeId)
    )
      throw new Error("Invalid workspace");
    for (const c of w.campaigns) {
      if (
        !c.title ||
        !Number.isInteger(c.revision) ||
        !Array.isArray(c.people) ||
        !c.people.some((p) => p.id === ownerId) ||
        !Array.isArray(c.activity) ||
        !Array.isArray(c.schedule) ||
        !["platform", "external", "unpaid"].includes(c.mode)
      )
        throw new Error("Invalid campaign");
      for (const p of c.people)
        if (
          !p.name ||
          !roleLabel[p.role] ||
          !Number.isFinite(p.fee) ||
          p.fee < 0
        )
          throw new Error("Invalid person");
    }
    if (
      !currentPerson(w.campaigns.find((c) => c.id === w.activeId)!, w.actorId)
    )
      w.actorId = ownerId;
    return { workspace: w, corrupt: false };
  } catch {
    return { workspace: createWorkspace(), corrupt: true };
  }
}
