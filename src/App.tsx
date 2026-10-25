import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Icon } from "./icons";
import type { IconName } from "./icons";
import {
  allApproved,
  approved,
  campaignBudget,
  createWorkspace,
  currentPerson,
  dateLabel,
  loadWorkspace,
  money,
  newCampaign,
  ownerId,
  paidAmount,
  payees,
  platformFee,
  ready,
  releaseBlock,
  roleLabel,
  STORAGE_KEY,
  transact,
} from "./model";
import type {
  Action,
  BriefInput,
  Campaign,
  Language,
  Person,
  Role,
} from "./model";
import { agreement, callSheet } from "./documents";
import {
  campaignExport,
  canSeeCampaignFinance,
  canSeePersonalTerms,
  visibleActivities,
  visiblePayees,
} from "./permissions";

type View =
  | "overview"
  | "people"
  | "plan"
  | "agreements"
  | "payments"
  | "activity";
type ModalState =
  | { type: "brief" | "create" | "person" | "reset" | "about" | "privacy" }
  | { type: "agreement"; personId: string }
  | { type: "callSheet" }
  | null;
const views: { id: View; icon: IconName; en: string; pt: string }[] = [
  { id: "overview", icon: "grid", en: "Overview", pt: "Visão geral" },
  {
    id: "people",
    icon: "people",
    en: "People & roles",
    pt: "Pessoas e funções",
  },
  { id: "plan", icon: "calendar", en: "Plan & location", pt: "Plano e local" },
  {
    id: "agreements",
    icon: "document",
    en: "Agreements & rights",
    pt: "Acordos e direitos",
  },
  { id: "payments", icon: "wallet", en: "Payments", pt: "Pagamentos" },
  { id: "activity", icon: "activity", en: "Activity", pt: "Atividade" },
];
const errors = {
  owner: [
    "This action belongs to the campaign coordinator.",
    "Esta ação é da coordenação da campanha.",
  ],
  client: [
    "Switch to the client or coordinator demo view for this action.",
    "Use a visão de cliente ou coordenação para esta ação.",
  ],
  approval: [
    "The current campaign needs everyone’s approval and any required funding first.",
    "A campanha atual precisa da aprovação de todos e do aporte necessário.",
  ],
  funding: [
    "Simulate client funding before releasing a payment.",
    "Simule o aporte do cliente antes de liberar um pagamento.",
  ],
  evidence: [
    "The required attendance, session, or delivery evidence is still missing.",
    "Faltam os registros necessários de presença, sessão ou entrega.",
  ],
  already: [
    "This step is already up to date.",
    "Esta etapa já está atualizada.",
  ],
  mode: [
    "This action is available for funded platform payments only.",
    "Esta ação exige pagamentos pela plataforma e valores previstos.",
  ],
  invalid: [
    "Please check the details and try again.",
    "Confira os dados e tente novamente.",
  ],
  locked: [
    "This version has funding or attendance recorded. Changes need a reviewed amendment and refund process beyond this prototype.",
    "Esta versão já tem aporte ou presença registrados. Alterações exigem aditivo e processo de reembolso, além deste protótipo.",
  ],
};

function Avatar({
  person,
  small = false,
}: {
  person: Person;
  small?: boolean;
}) {
  return (
    <span
      className={`avatar ${person.color} ${small ? "small" : ""}`}
      aria-label={person.name}
    >
      {person.initials}
    </span>
  );
}
function Tag({ children, tone = "" }: { children: ReactNode; tone?: string }) {
  return <span className={`tag ${tone}`}>{children}</span>;
}
function Button({
  children,
  icon,
  onClick,
  secondary = false,
  disabled = false,
  type = "button",
  className = "",
  title,
}: {
  children: ReactNode;
  icon?: IconName;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  title?: string;
}) {
  return (
    <button
      type={type}
      className={`button ${secondary ? "secondary" : ""} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}
function Dialog({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? "wide" : ""}`}
      onCancel={close}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Close / Fechar"
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Seascape() {
  return (
    <div className="seascape" aria-hidden="true">
      <svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sea" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#b0bcb0" />
            <stop offset="1" stopColor="#42635d" />
          </linearGradient>
          <linearGradient id="sand" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#dfd5b9" />
            <stop offset="1" stopColor="#efe7d5" />
          </linearGradient>
          <filter id="grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency=".7"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope=".12" />
            </feComponentTransfer>
            <feBlend in="SourceGraphic" mode="multiply" />
          </filter>
        </defs>
        <rect width="600" height="600" fill="url(#sea)" />
        <g filter="url(#grain)">
          <path
            d="M520-60C400 60 536 126 407 251S274 375 321 458 196 562 94 660H650V-60Z"
            fill="url(#sand)"
          />
          <path
            d="M500-60C380 60 516 126 387 251S254 375 301 458 176 562 74 660"
            fill="none"
            stroke="#eceddf"
            strokeWidth="17"
            opacity=".58"
          />
          <path
            d="M473-60C353 60 489 126 360 251S227 375 274 458 149 562 47 660"
            fill="none"
            stroke="#e1e7dc"
            strokeWidth="2"
            opacity=".5"
          />
          <path
            d="M450-60C330 60 466 126 337 251S204 375 251 458 126 562 24 660"
            fill="none"
            stroke="#d1ded4"
            strokeWidth="2"
            opacity=".3"
          />
        </g>
      </svg>
      <span className="art-caption">
        RIO DE JANEIRO
        <br />
        22°59′ S · 43°12′ W
      </span>
      <span className="art-mark">m.</span>
    </div>
  );
}
function BriefForm({
  campaign,
  lang,
  creating,
  onSubmit,
  close,
}: {
  campaign: Campaign;
  lang: Language;
  creating: boolean;
  onSubmit: (input: BriefInput) => void;
  close: () => void;
}) {
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const get = (key: string) => String(data.get(key) ?? "").trim();
    onSubmit({
      title: get("title"),
      client: get("client"),
      goal: get("goal"),
      date: get("date"),
      location: get("location"),
      address: get("address"),
      mode: get("mode") as Campaign["mode"],
      usage: get("usage"),
      term: get("term"),
      territory: get("territory"),
      cancellation: get("cancellation"),
      aiAllowed: data.get("aiAllowed") === "on",
    });
  };
  return (
    <form onSubmit={submit} className="form">
      <p className="muted">
        {creating
          ? t(
              "Start with the essentials. Champaign prepares the team, schedule, draft agreements, and payment milestones for you.",
              "Comece pelo essencial. Champaign prepara equipe, programação, minutas e parcelas para você.",
            )
          : t(
              "Material changes create a new version. Every participant will need to review their agreement again.",
              "Alterações relevantes criam nova versão. Cada participante deverá revisar seu acordo novamente.",
            )}
      </p>
      <div className="form-grid">
        <label className="span2">
          {t("Campaign name", "Nome da campanha")}
          <input
            name="title"
            required
            maxLength={100}
            defaultValue={creating ? "" : campaign.title}
            placeholder={t("Something worth making.", "Algo que vale criar.")}
          />
        </label>
        <label>
          {t("Client / brand", "Cliente / marca")}
          <input
            name="client"
            required
            maxLength={80}
            defaultValue={creating ? "" : campaign.client}
          />
        </label>
        <label>
          {t("Shoot date", "Data da sessão")}
          <input
            name="date"
            type="date"
            required
            defaultValue={campaign.date}
          />
        </label>
        <label className="span2">
          {t("Goal & deliverables", "Objetivo e entregas")}
          <textarea
            name="goal"
            required
            rows={3}
            maxLength={1500}
            defaultValue={creating ? "" : campaign.goal}
          />
        </label>
        <label>
          {t("Location name", "Nome do local")}
          <input
            name="location"
            required
            maxLength={100}
            defaultValue={campaign.location}
          />
        </label>
        <label>
          {t("Address / access details", "Endereço / acesso")}
          <input
            name="address"
            required
            maxLength={250}
            defaultValue={campaign.address}
          />
        </label>
        <label className="span2">
          {t("Payment arrangement", "Forma de pagamento")}
          <select name="mode" defaultValue={campaign.mode}>
            <option value="platform">
              {t(
                "Platform payments · simulated funding · illustrative 5% fee",
                "Pela plataforma · aporte simulado · taxa ilustrativa de 5%",
              )}
            </option>
            <option value="external">
              {t(
                "Paid outside the platform · free coordination",
                "Pago fora da plataforma · coordenação gratuita",
              )}
            </option>
            <option value="unpaid">
              {t(
                "Unpaid collaboration · no service fees",
                "Colaboração não remunerada · sem honorários",
              )}
            </option>
          </select>
        </label>
        <div className="form-divider span2">
          {t("Rights everyone can understand", "Direitos que todos entendem")}
        </div>
        <label className="span2">
          {t("Permitted channels & uses", "Canais e usos permitidos")}
          <textarea
            name="usage"
            required
            rows={2}
            maxLength={1000}
            defaultValue={campaign.usage}
          />
        </label>
        <label>
          {t("Usage term", "Prazo de uso")}
          <input
            name="term"
            required
            maxLength={100}
            defaultValue={campaign.term}
          />
        </label>
        <label>
          {t("Usage territory", "Território de uso")}
          <input
            name="territory"
            required
            maxLength={100}
            defaultValue={campaign.territory}
          />
        </label>
        <label className="check-label span2">
          <input
            name="aiAllowed"
            type="checkbox"
            defaultChecked={campaign.aiAllowed}
          />
          <span>
            {t(
              "Request a separate AI-use negotiation. This does not grant permission.",
              "Solicitar negociação separada de IA. Isto não concede autorização.",
            )}
          </span>
        </label>
        <label className="span2">
          {t("Cancellation & safety terms", "Cancelamento e segurança")}
          <textarea
            name="cancellation"
            required
            rows={3}
            maxLength={1500}
            defaultValue={campaign.cancellation}
          />
        </label>
      </div>
      <div className="form-footer">
        <Button secondary onClick={close}>
          {t("Cancel", "Cancelar")}
        </Button>
        <Button type="submit" icon="spark">
          {creating
            ? t("Create campaign", "Criar campanha")
            : t("Publish new version", "Publicar nova versão")}
        </Button>
      </div>
    </form>
  );
}

export default function App() {
  const [loaded] = useState(loadWorkspace);
  const [workspace, setWorkspace] = useState(loaded.workspace);
  const [saveError, setSaveError] = useState(loaded.corrupt);
  const [storageEnabled, setStorageEnabled] = useState(!loaded.corrupt);
  const [view, setView] = useState<View>(
    () => views.find((v) => `#/${v.id}` === location.hash)?.id ?? "overview",
  );
  const [modal, setModal] = useState<ModalState>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [printText, setPrintText] = useState("");
  const c = workspace.campaigns.find(
    (campaign) => campaign.id === workspace.activeId,
  )!;
  const actor = currentPerson(c, workspace.actorId)!;
  const lang = workspace.language;
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);
  const isOwner = actor.id === ownerId;
  const approvers = c.people.filter((p) => approved(c, p)).length;
  const budget = campaignBudget(c);
  const seesFinance = canSeeCampaignFinance(c, actor.id);
  const displayedBudget = seesFinance
    ? budget
    : c.mode === "unpaid"
      ? 0
      : actor.fee;
  const displayedPaid = isOwner
    ? paidAmount(c)
    : (actor.sessionPaid ? actor.fee / 2 : 0) +
      (actor.deliveryPaid ? actor.fee / 2 : 0);
  const activity = visibleActivities(c, actor.id);
  const hasPrivateTerms = (personId: string) =>
    canSeePersonalTerms(c, actor.id, personId);
  const modeText =
    c.mode === "platform"
      ? t("Platform payments", "Pela plataforma")
      : c.mode === "external"
        ? t("Paid externally", "Pago externamente")
        : t("Unpaid collaboration", "Não remunerada");
  const locked =
    c.funded || c.sessionComplete || c.people.some((p) => p.checkedIn);
  const notify = (message: string) => setToast(message);
  const go = (next: View) => {
    setView(next);
    setMenuOpen(false);
    location.hash = `/${next}`;
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  useEffect(() => {
    const change = () =>
      setView(
        views.find((v) => `#/${v.id}` === location.hash)?.id ?? "overview",
      );
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  }, [lang]);
  useEffect(() => {
    setPrintText("");
  }, [workspace.actorId, workspace.activeId]);
  useEffect(() => {
    if (!storageEnabled) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [workspace, storageEnabled]);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timeout);
  }, [toast]);
  const act = (action: Action): boolean => {
    const result = transact(c, actor.id, action);
    if (result.error) {
      notify(errors[result.error][lang === "en" ? 0 : 1]);
      return false;
    }
    setWorkspace((w) => ({
      ...w,
      campaigns: w.campaigns.map((x) => (x.id === c.id ? result.campaign : x)),
    }));
    notify(
      t(
        "Saved. The campaign is up to date.",
        "Salvo. A campanha está atualizada.",
      ),
    );
    return true;
  };
  const switchActor = (personId: string) => {
    setWorkspace((w) => ({ ...w, actorId: personId }));
    notify(
      t(
        "Demo view changed. This is not a real sign-in.",
        "Visão de demonstração alterada. Isto não é um login real.",
      ),
    );
  };
  const print = (text: string) => {
    setPrintText(text);
    setTimeout(() => window.print(), 80);
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(campaignExport(c, actor.id), null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `champaign-${c.id}-${actor.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(
      t(
        "Campaign exported with this role’s permitted details.",
        "Campanha exportada com os dados permitidos para esta função.",
      ),
    );
  };
  const pending = c.people.filter((p) => !approved(c, p));
  const status = !allApproved(c)
    ? t("Getting everyone aligned", "Alinhando a equipe")
    : !ready(c)
      ? t("Ready for funding", "Pronta para aporte")
      : !c.sessionComplete
        ? t("Ready for the shoot", "Pronta para a sessão")
        : payees(c).every((p) => p.deliveryPaid) && c.mode === "platform"
          ? t("All payments complete", "Pagamentos concluídos")
          : t("Shoot complete · handover", "Sessão concluída · entregas");

  const nextAction = () => {
    if (!approved(c, actor))
      return {
        title: t("Your agreement is ready.", "Seu acordo está pronto."),
        body: t(
          "Review your role, fee, and image usage before saying yes.",
          "Revise sua função, seus honorários e o uso de imagem antes de aceitar.",
        ),
        button: t("Review my agreement", "Revisar meu acordo"),
        action: () => setModal({ type: "agreement", personId: actor.id }),
      };
    if (pending.length && !isOwner)
      return {
        title: t(
          "Waiting for the team’s approvals.",
          "Aguardando as aprovações da equipe.",
        ),
        body: t(
          "Your terms stay private while everyone reviews the shared plan.",
          "Seus termos ficam privados enquanto todos revisam o plano.",
        ),
        button: t("See approval status", "Ver aprovações"),
        action: () => go("agreements"),
      };
    if (pending.length)
      return {
        title: t(
          `${pending.length} more ${pending.length === 1 ? "yes" : "approvals"} to go.`,
          `Falta${pending.length === 1 ? "" : "m"} ${pending.length} ${pending.length === 1 ? "aprovação" : "aprovações"}.`,
        ),
        body: t(
          `${pending.map((p) => p.name.split(" ")[0]).join(", ")} still needs to review this version.`,
          `${pending.map((p) => p.name.split(" ")[0]).join(", ")} precisa revisar esta versão.`,
        ),
        button: t(
          `Preview ${pending[0].name.split(" ")[0]}’s review`,
          `Ver revisão de ${pending[0].name.split(" ")[0]}`,
        ),
        action: () => {
          switchActor(pending[0].id);
          setModal({ type: "agreement", personId: pending[0].id });
        },
      };
    if (c.mode === "platform" && !c.funded)
      return {
        title: t("Good to go. Time to fund.", "Tudo alinhado. Hora do aporte."),
        body: t(
          "The client funds the agreed budget before anyone starts.",
          "O cliente aporta o orçamento combinado antes do início.",
        ),
        button: t("See payment plan", "Ver plano de pagamento"),
        action: () => go("payments"),
      };
    if (!actor.checkedIn)
      return {
        title: t(
          "Your place is on the call sheet.",
          "Seu lugar está na ordem do dia.",
        ),
        body: t(
          "Confirm arrival in the demo to unlock the next step.",
          "Confirme a chegada na demo para avançar.",
        ),
        button: t("Simulate my check-in", "Simular meu check-in"),
        action: () => act({ type: "checkIn" }),
      };
    return {
      title: t("Everyone knows the next step.", "Todos sabem o próximo passo."),
      body: t(
        "Keep the call sheet, handovers, and approvals in one place.",
        "Mantenha programação, entregas e aprovações no mesmo lugar.",
      ),
      button: t("Open the plan", "Abrir o plano"),
      action: () => go("plan"),
    };
  };
  const next = nextAction();
  const progress = [
    allApproved(c),
    c.mode !== "platform" || c.funded,
    c.sessionComplete,
    c.people
      .filter((p) => p.role !== "client")
      .every((p) => p.deliveryApproved),
  ];

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t("Skip to content", "Ir para o conteúdo")}
      </a>
      <div className="app-shell">
        <aside
          className={`sidebar ${menuOpen ? "open" : ""}`}
          aria-label={t("Main navigation", "Navegação principal")}
        >
          <button
            className="wordmark"
            onClick={() => go("overview")}
            aria-label="Champaign home"
          >
            champaign<span>✳</span>
          </button>
          <div className="workspace-label">
            NAYA LIMA <span>STUDIO</span>
          </div>
          <label className="campaign-select-label">
            {t("CAMPAIGN", "CAMPANHA")}
            <span className="campaign-select">
              <select
                aria-label={t("Select campaign", "Selecionar campanha")}
                value={c.id}
                onChange={(e) => {
                  setWorkspace((w) => ({
                    ...w,
                    activeId: e.target.value,
                    actorId: ownerId,
                  }));
                  go("overview");
                }}
              >
                {workspace.campaigns.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}
                  </option>
                ))}
              </select>
              <Icon name="chevron" size={14} />
            </span>
          </label>
          <nav>
            {views.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${view === item.id ? "active" : ""}`}
                aria-current={view === item.id ? "page" : undefined}
                onClick={() => go(item.id)}
              >
                <Icon name={item.icon} size={19} />
                {item[lang]}
                {item.id === "agreements" && pending.length > 0 && (
                  <span className="nav-count">{pending.length}</span>
                )}
              </button>
            ))}
          </nav>
          {isOwner && (
            <button
              className="new-campaign"
              onClick={() => setModal({ type: "create" })}
            >
              <Icon name="plus" size={16} />
              {t("New campaign", "Nova campanha")}
            </button>
          )}
          <div className="sidebar-bottom">
            <div className="free-note">
              <Icon name="leaf" size={20} />
              <p>
                {t("More creating.", "Mais criação.")}
                <br />
                {t("Less in between.", "Menos burocracia.")}
                <span>
                  {t(
                    "Free to coordinate. Yours to run.",
                    "Coordene de graça. Do seu jeito.",
                  )}
                </span>
              </p>
            </div>
            <button
              className="sidebar-person"
              onClick={() => setModal({ type: "about" })}
            >
              <span className="avatar sage small">NL</span>
              <span>
                Naya’s workspace
                <small>
                  {t("About this prototype", "Sobre este protótipo")}
                </small>
              </span>
              <Icon name="chevron" size={14} />
            </button>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <button
              className="icon-button mobile-menu"
              aria-label={t("Open navigation", "Abrir navegação")}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Icon name={menuOpen ? "close" : "menu"} />
            </button>
            <div className="breadcrumbs">
              {t("Workspace", "Espaço de trabalho")}
              <span>/</span>
              <strong>{views.find((v) => v.id === view)?.[lang]}</strong>
            </div>
            <div className="topbar-controls">
              <div
                className="language-switch"
                aria-label={t("Language", "Idioma")}
              >
                {(["en", "pt"] as Language[]).map((l) => (
                  <button
                    key={l}
                    aria-pressed={lang === l}
                    className={lang === l ? "selected" : ""}
                    onClick={() => setWorkspace((w) => ({ ...w, language: l }))}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
              <label className="persona-control">
                <span>{t("Demo view", "Visão demo")}</span>
                <select
                  aria-label={t("Demo persona", "Pessoa na demo")}
                  value={actor.id}
                  onChange={(e) => switchActor(e.target.value)}
                >
                  {c.people.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <Icon name="chevron" size={13} />
              </label>
              <Avatar person={actor} small />
            </div>
          </header>
          <main id="main-content" className="main-content">
            <div className="demo-strip">
              <span className="demo-dot" />
              <span>
                {t("Interactive prototype", "Protótipo interativo")}
                <span className="strip-detail">
                  {" "}
                  ·{" "}
                  {t(
                    "Sample team · saved on this device",
                    "Equipe de exemplo · salvo neste dispositivo",
                  )}
                </span>
              </span>
              <button onClick={() => setModal({ type: "about" })}>
                {t("How it works", "Como funciona")}
                <Icon name="arrowUp" size={13} />
              </button>
            </div>
            {saveError && (
              <div className="alert" role="alert">
                {t(
                  "Local saving is unavailable or a previous save could not be read. Your previous data has not been replaced. Export this workspace or reset the demo to enable saving.",
                  "O armazenamento local está indisponível ou os dados anteriores não puderam ser lidos. Os dados anteriores não foram substituídos. Exporte este espaço ou reinicie a demo para salvar.",
                )}{" "}
                <button onClick={download}>{t("Export", "Exportar")}</button> ·{" "}
                <button onClick={() => setModal({ type: "reset" })}>
                  {t("Reset demo", "Reiniciar demo")}
                </button>
              </div>
            )}
            <div className="page-heading">
              <div>
                <p className="eyebrow">
                  {view === "overview"
                    ? t(
                        "A SHARED HOME FOR GOOD WORK",
                        "UM LUGAR PARA CRIAR EM CONJUNTO",
                      )
                    : `${c.client.toUpperCase()} / V${c.revision}`}
                </p>
                <h1>
                  {view === "overview"
                    ? t("Make something together.", "Vamos criar juntos.")
                    : views.find((v) => v.id === view)?.[lang]}
                </h1>
                <p className="page-subtitle">
                  {view === "overview"
                    ? t(
                        "Every person, plan, and promise. All in one place.",
                        "Cada pessoa, plano e compromisso. Tudo no mesmo lugar.",
                      )
                    : c.title}
                </p>
              </div>
              <div className="page-actions">
                <button className="text-button export-label" onClick={download}>
                  <Icon name="download" size={17} />
                  {t("Export", "Exportar")}
                </button>
                {isOwner && (
                  <Button
                    secondary
                    icon="edit"
                    onClick={() => setModal({ type: "brief" })}
                    disabled={locked}
                    title={
                      locked
                        ? t(
                            "Funded or started campaigns require an amendment process.",
                            "Campanhas com aporte ou iniciadas exigem aditivo.",
                          )
                        : undefined
                    }
                  >
                    {t("Edit brief", "Editar briefing")}
                  </Button>
                )}
              </div>
            </div>

            <div className="access-strip">
              <Icon name="lock" size={13} />
              <span>
                {isOwner
                  ? t(
                      "Coordinator view · full campaign access",
                      "Visão da coordenação · acesso completo",
                    )
                  : actor.role === "client"
                    ? t(
                        "Client view · your quote and shared plan",
                        "Visão do cliente · seu orçamento e plano compartilhado",
                      )
                    : t(
                        "Collaborator view · your terms and payments only",
                        "Visão de participante · apenas seus termos e pagamentos",
                      )}
              </span>
              <button onClick={() => setModal({ type: "privacy" })}>
                {t("Visibility rules", "Regras de visibilidade")}
                <Icon name="arrowUp" size={12} />
              </button>
            </div>
            {view === "overview" && (
              <div className="page-enter">
                <section className="campaign-hero">
                  <div className="hero-copy">
                    <div className="hero-eyebrow">
                      <span>{c.client.toUpperCase()} / 001</span>
                      <Tag tone="light">
                        <span className="tiny-dot" />
                        {t("In the making", "Em criação")}
                      </Tag>
                    </div>
                    <h2>{c.title}</h2>
                    <p>
                      {t(
                        "A small team. A shared vision. A really good day on set.",
                        "Uma equipe próxima. Uma visão em comum. Um ótimo dia de criação.",
                      )}
                    </p>
                    <div className="hero-details">
                      <span>
                        <Icon name="calendar" size={15} />
                        {dateLabel(c.date, lang)}
                      </span>
                      <span>
                        <Icon name="pin" size={15} />
                        {c.location}
                      </span>
                    </div>
                    <div className="hero-footer">
                      <div className="avatar-stack">
                        {c.people.slice(0, 5).map((p) => (
                          <Avatar key={p.id} person={p} small />
                        ))}
                      </div>
                      <span>
                        {c.people.length}{" "}
                        {t("people, one campaign", "pessoas, uma campanha")}
                      </span>
                      <button
                        aria-label={t("View team", "Ver equipe")}
                        onClick={() => go("people")}
                      >
                        <Icon name="arrow" size={20} />
                      </button>
                    </div>
                  </div>
                  <Seascape />
                </section>
                <section
                  className="stats-grid"
                  aria-label={t("Campaign summary", "Resumo da campanha")}
                >
                  <button onClick={() => go("people")}>
                    <span className="stat-icon">
                      <Icon name="people" size={18} />
                    </span>
                    <div>
                      <span className="stat-label">
                        {t("THE PEOPLE", "A EQUIPE")}
                      </span>
                      <strong>
                        {String(c.people.length).padStart(2, "0")}{" "}
                        <small>
                          {t("creative collaborators", "pessoas colaborando")}
                        </small>
                      </strong>
                    </div>
                    <Icon name="arrowUp" size={15} />
                  </button>
                  <button onClick={() => go("agreements")}>
                    <span className="stat-icon">
                      <Icon name="document" size={18} />
                    </span>
                    <div>
                      <span className="stat-label">
                        {t("ON THE SAME PAGE", "TUDO ALINHADO")}
                      </span>
                      <strong>
                        {approvers}
                        <em>/{c.people.length}</em>{" "}
                        <small>
                          {t("agreements approved", "acordos aprovados")}
                        </small>
                      </strong>
                    </div>
                    <Icon name="arrowUp" size={15} />
                  </button>
                  <button onClick={() => go("payments")}>
                    <span className="stat-icon">
                      <Icon name="wallet" size={18} />
                    </span>
                    <div>
                      <span className="stat-label">
                        {seesFinance
                          ? t("CAMPAIGN BUDGET", "ORÇAMENTO")
                          : t("YOUR SERVICE FEE", "SEUS HONORÁRIOS")}
                      </span>
                      <strong>
                        {money(displayedBudget, lang)}
                        <small>{modeText}</small>
                      </strong>
                    </div>
                    <Icon name="arrowUp" size={15} />
                  </button>
                </section>
                <div className="overview-columns">
                  <section className="panel next-panel">
                    <div className="section-heading">
                      <h2>
                        {t("A little nudge forward.", "Um passo de cada vez.")}
                      </h2>
                      <Tag>{t("NEXT UP", "PRÓXIMO PASSO")}</Tag>
                    </div>
                    <div className="next-action">
                      <div className="next-icon">
                        <Icon name="spark" size={25} />
                      </div>
                      <div>
                        <h3>{next.title}</h3>
                        <p>{next.body}</p>
                        <Button icon="arrow" onClick={next.action}>
                          {next.button}
                        </Button>
                      </div>
                    </div>
                    <div className="automation-note">
                      <Icon name="spark" size={14} />
                      {t(
                        "Agreements, call sheet, and milestones follow your brief automatically.",
                        "Acordos, ordem do dia e parcelas acompanham seu briefing automaticamente.",
                      )}
                    </div>
                  </section>
                  <section className="panel journey-panel">
                    <div className="section-heading">
                      <h2>{t("From idea to done.", "Da ideia à entrega.")}</h2>
                      <span className="muted small-text">
                        {progress.filter(Boolean).length}/4
                      </span>
                    </div>
                    <div className="journey">
                      {[
                        t("Everyone aligned", "Equipe alinhada"),
                        t("Payment arrangement ready", "Pagamento preparado"),
                        t("A good day on set", "Sessão concluída"),
                        t("Delivered & approved", "Entregas aprovadas"),
                      ].map((label, i) => (
                        <button
                          key={label}
                          onClick={() =>
                            go(
                              (
                                [
                                  "agreements",
                                  "payments",
                                  "plan",
                                  "people",
                                ] as View[]
                              )[i],
                            )
                          }
                        >
                          <span
                            className={`step-circle ${progress[i] ? "complete" : ""}`}
                          >
                            {progress[i] ? (
                              <Icon name="check" size={13} />
                            ) : (
                              `0${i + 1}`
                            )}
                          </span>
                          <span>{label}</span>
                          {i === progress.findIndex((x) => !x) && (
                            <span className="you-are-here">
                              {t("HERE", "AQUI")}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
                <section className="panel overview-team">
                  <div className="section-heading">
                    <h2>{t("The people behind it.", "Quem faz acontecer.")}</h2>
                    <button
                      className="text-button"
                      onClick={() => go("people")}
                    >
                      {t("Meet the team", "Ver equipe")}
                      <Icon name="arrow" size={15} />
                    </button>
                  </div>
                  <div className="team-mini-grid">
                    {c.people.map((p) => (
                      <button
                        key={p.id}
                        className="team-mini"
                        disabled={!hasPrivateTerms(p.id)}
                        onClick={() =>
                          setModal({ type: "agreement", personId: p.id })
                        }
                      >
                        <Avatar person={p} />
                        <span>
                          <strong>{p.name}</strong>
                          <small>{roleLabel[p.role][lang]}</small>
                        </span>
                        <span
                          className={`approval-dot ${approved(c, p) ? "yes" : ""}`}
                          title={
                            approved(c, p)
                              ? t("Approved", "Aprovado")
                              : t("Needs review", "Revisão pendente")
                          }
                        >
                          {approved(c, p) ? (
                            <Icon name="check" size={12} />
                          ) : (
                            <Icon name="clock" size={12} />
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {view === "people" && (
              <div className="page-enter">
                <div className="intro-row">
                  <p>
                    {t(
                      "Different roles. Shared expectations. Everyone gets a clear agreement and a place in the plan.",
                      "Funções diferentes. Expectativas alinhadas. Cada pessoa tem seu acordo e seu lugar no plano.",
                    )}
                  </p>
                  {isOwner && (
                    <Button
                      icon="plus"
                      disabled={locked}
                      onClick={() => setModal({ type: "person" })}
                    >
                      {t("Add collaborator", "Adicionar pessoa")}
                    </Button>
                  )}
                </div>
                <div className="people-grid">
                  {c.people.map((p) => (
                    <article className="person-card" key={p.id}>
                      <div className="person-card-top">
                        <Avatar person={p} />
                        <Tag tone={approved(c, p) ? "success" : "pending"}>
                          {approved(c, p)
                            ? t("Approved", "Aprovado")
                            : t("Needs review", "Revisão pendente")}
                        </Tag>
                      </div>
                      <h2>{p.name}</h2>
                      <p className="person-role">
                        {roleLabel[p.role][lang]}
                        {p.id === ownerId &&
                          ` · ${t("Coordinator", "Coordenação")}`}
                      </p>
                      <div className="person-fee">
                        <span>
                          {t("Agreed service fee", "Honorários combinados")}
                        </span>
                        <strong>
                          {hasPrivateTerms(p.id) ? (
                            money(c.mode === "unpaid" ? 0 : p.fee, lang)
                          ) : (
                            <span className="private-value">
                              <Icon name="lock" size={12} />
                              {t("Private", "Privado")}
                            </span>
                          )}
                        </strong>
                      </div>
                      <div className="person-facts">
                        <span>
                          <Icon
                            name={p.checkedIn ? "check" : "circle"}
                            size={14}
                          />
                          {p.checkedIn
                            ? t(
                                "Arrival confirmed · demo",
                                "Chegada confirmada · demo",
                              )
                            : t("Not checked in", "Sem check-in")}
                        </span>
                        <span>
                          <Icon
                            name={p.deliveryApproved ? "check" : "circle"}
                            size={14}
                          />
                          {p.deliveryApproved
                            ? t("Handover approved", "Entrega aprovada")
                            : p.delivered
                              ? t(
                                  "Handover awaiting review",
                                  "Entrega aguardando revisão",
                                )
                              : t("Handover pending", "Entrega pendente")}
                        </span>
                      </div>
                      <div className="person-buttons">
                        <Button
                          secondary
                          icon={hasPrivateTerms(p.id) ? "document" : "lock"}
                          disabled={!hasPrivateTerms(p.id)}
                          onClick={() =>
                            setModal({ type: "agreement", personId: p.id })
                          }
                        >
                          {hasPrivateTerms(p.id)
                            ? t("View agreement", "Ver acordo")
                            : t("Private agreement", "Acordo privado")}
                        </Button>
                        {actor.role === "client" &&
                          p.delivered &&
                          !p.deliveryApproved && (
                            <Button
                              icon="check"
                              onClick={() =>
                                act({ type: "approveDelivery", personId: p.id })
                              }
                            >
                              {t("Approve handover", "Aprovar entrega")}
                            </Button>
                          )}
                        {actor.id === p.id &&
                          p.role !== "client" &&
                          c.sessionComplete &&
                          !p.delivered && (
                            <Button
                              icon="check"
                              onClick={() => act({ type: "deliver" })}
                            >
                              {t(
                                "Submit handover · demo",
                                "Enviar entrega · demo",
                              )}
                            </Button>
                          )}
                      </div>
                    </article>
                  ))}
                </div>
                <div className="principle-note">
                  <Icon name="shield" />
                  <p>
                    <strong>
                      {t(
                        "Reputation starts with participation.",
                        "A reputação começa pela participação.",
                      )}
                    </strong>
                    {t(
                      "Unpaid and externally paid work can have the same coordination record. This demo does not verify identities, attendance, or reputation.",
                      "Trabalhos gratuitos e pagos externamente podem ter o mesmo registro de coordenação. A demo não verifica identidade, presença ou reputação.",
                    )}
                  </p>
                </div>
              </div>
            )}

            {view === "plan" && (
              <div className="page-enter">
                <div className="plan-top">
                  <section className="panel brief-panel">
                    <p className="eyebrow">
                      {t("THE SHARED INTENTION", "O OBJETIVO EM COMUM")}
                    </p>
                    <h2>{t("What we’re making.", "O que vamos criar.")}</h2>
                    <p className="brief-goal">{c.goal}</p>
                    <div className="brief-meta">
                      <span>
                        <Icon name="calendar" size={17} />
                        {dateLabel(c.date, lang)}
                      </span>
                      <span>
                        <Icon name="clock" size={17} />
                        {c.timezone}
                      </span>
                    </div>
                  </section>
                  <section className="location-panel">
                    <div className="location-art">
                      <Icon name="pin" size={34} />
                      <span>RIO / BRASIL</span>
                    </div>
                    <div className="location-copy">
                      <p className="eyebrow">
                        {t("MEET US HERE", "NOS ENCONTRAMOS AQUI")}
                      </p>
                      <h2>{c.location}</h2>
                      <p>{c.address}</p>
                      <Tag tone="pending">
                        {t(
                          "Sample location · unverified",
                          "Local de exemplo · não verificado",
                        )}
                      </Tag>
                    </div>
                  </section>
                </div>
                <section className="panel schedule-panel">
                  <div className="section-heading">
                    <div>
                      <h2>
                        {t("A plan for the day.", "Um plano para o dia.")}
                      </h2>
                      <p className="muted small-text">
                        {t(
                          "All times are local. Changes require fresh approvals.",
                          "Horários locais. Alterações exigem novas aprovações.",
                        )}
                      </p>
                    </div>
                    <Button
                      secondary
                      icon="download"
                      onClick={() => setModal({ type: "callSheet" })}
                    >
                      {t("Call sheet", "Ordem do dia")}
                    </Button>
                  </div>
                  <div className="schedule-list">
                    {c.schedule.map((item) => (
                      <div
                        className={`schedule-item ${item.done ? "done" : ""}`}
                        key={item.id}
                      >
                        <time>{item.time}</time>
                        <button
                          className="schedule-check"
                          aria-label={`${t("Toggle completion", "Alterar conclusão")}: ${lang === "en" ? item.title : item.titlePt}`}
                          disabled={
                            !ready(c) || (!isOwner && item.owner !== actor.id)
                          }
                          onClick={() =>
                            act({ type: "schedule", itemId: item.id })
                          }
                        >
                          {item.done && <Icon name="check" size={15} />}
                        </button>
                        <div className="schedule-title">
                          <h3>{lang === "en" ? item.title : item.titlePt}</h3>
                          <span>
                            {c.people.find((p) => p.id === item.owner)?.name}
                          </span>
                        </div>
                        {isOwner && !locked && (
                          <label className="time-edit">
                            <span className="sr-only">
                              {t("Change time for", "Alterar horário de")}{" "}
                              {item.title}
                            </span>
                            <input
                              aria-label={`${t("Time for", "Horário de")} ${item.title}`}
                              type="time"
                              value={item.time}
                              onChange={(e) =>
                                act({
                                  type: "editSchedule",
                                  itemId: item.id,
                                  time: e.target.value,
                                })
                              }
                            />
                          </label>
                        )}
                        <Icon name={item.done ? "check" : "clock"} size={16} />
                      </div>
                    ))}
                  </div>
                  <div className="schedule-footer">
                    <span>
                      <Icon name="shield" size={17} />
                      {status}
                    </span>
                    <div>
                      {!actor.checkedIn && (
                        <Button
                          secondary
                          icon="pin"
                          disabled={!ready(c)}
                          onClick={() => act({ type: "checkIn" })}
                        >
                          {t("Simulate my check-in", "Simular meu check-in")}
                        </Button>
                      )}
                      {isOwner && (
                        <Button
                          icon="check"
                          disabled={
                            c.sessionComplete ||
                            !ready(c) ||
                            !c.people
                              .filter((p) => p.role !== "client")
                              .every((p) => p.checkedIn)
                          }
                          onClick={() => act({ type: "completeSession" })}
                        >
                          {c.sessionComplete
                            ? t("Session complete", "Sessão concluída")
                            : t(
                                "Confirm shoot completed",
                                "Confirmar sessão concluída",
                              )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="quiet-note">
                    {t(
                      "Before work: everyone approves the current version; platform campaigns also need simulated funding. Before wrap: model and crew must check in. Attendance and delivery are separate records.",
                      "Antes do trabalho: todos aprovam a versão atual; campanhas pela plataforma também precisam de aporte simulado. Antes de encerrar: modelo e equipe devem fazer check-in. Presença e entrega são registros separados.",
                    )}
                  </p>
                </section>
              </div>
            )}

            {view === "agreements" && (
              <div className="page-enter">
                <div className="rights-banner">
                  <div className="rights-icon">
                    <Icon name="shield" size={29} />
                  </div>
                  <div>
                    <p className="eyebrow">
                      {t(
                        "CLEAR TERMS. HUMAN CHOICE.",
                        "TERMOS CLAROS. ESCOLHA HUMANA.",
                      )}
                    </p>
                    <h2>
                      {t(
                        "Your work. Your image. Your say.",
                        "Seu trabalho. Sua imagem. Sua escolha.",
                      )}
                    </h2>
                    <p>
                      {t(
                        "One shared brief, personal agreements, and explicit limits on how the work can be used.",
                        "Um briefing em comum, acordos individuais e limites explícitos para o uso do trabalho.",
                      )}
                    </p>
                  </div>
                </div>
                <div className="rights-grid">
                  <div className="panel">
                    <p className="eyebrow">
                      {t("PERMITTED USE", "USO PERMITIDO")}
                    </p>
                    <h3>
                      {c.territory} · {c.term}
                    </h3>
                    <p>{c.usage}</p>
                  </div>
                  <div className="panel">
                    <p className="eyebrow">
                      {t("AI & DIGITAL LIKENESS", "IA E IMAGEM DIGITAL")}
                    </p>
                    <h3>
                      {c.aiAllowed
                        ? t(
                            "Separate negotiation requested",
                            "Negociação separada solicitada",
                          )
                        : t(
                            "No synthetic reuse by default",
                            "Sem reutilização sintética por padrão",
                          )}
                    </h3>
                    <p>
                      {t(
                        "Training, face/body swaps, virtual clothing, and new performances require a specific agreement. A request is never a license.",
                        "Treinamento, troca de rosto/corpo, roupas virtuais e novas performances exigem acordo específico. Solicitação não é licença.",
                      )}
                    </p>
                  </div>
                </div>
                <section className="panel agreement-panel">
                  <div className="section-heading">
                    <h2>
                      {t("Everyone’s agreement.", "O acordo de cada pessoa.")}
                    </h2>
                    <Tag>
                      {t("VERSION", "VERSÃO")} {c.revision}
                    </Tag>
                  </div>
                  {c.people.map((p) => (
                    <div className="agreement-row" key={p.id}>
                      <span className="doc-icon">
                        <Icon name="document" />
                      </span>
                      <div>
                        <h3>{p.name}</h3>
                        <p>
                          {roleLabel[p.role][lang]} ·{" "}
                          {t(
                            "Personal terms + shared brief",
                            "Termos individuais + briefing",
                          )}
                        </p>
                      </div>
                      <Tag tone={approved(c, p) ? "success" : "pending"}>
                        {approved(c, p)
                          ? `${t("Approved", "Aprovado")} · v${c.revision}`
                          : p.approvedRevision
                            ? t("New review needed", "Nova revisão necessária")
                            : t("Awaiting review", "Aguardando revisão")}
                      </Tag>
                      <button
                        className="text-button"
                        disabled={!hasPrivateTerms(p.id)}
                        onClick={() =>
                          setModal({ type: "agreement", personId: p.id })
                        }
                      >
                        {hasPrivateTerms(p.id)
                          ? t("Review", "Revisar")
                          : t("Private", "Privado")}
                        <Icon
                          name={hasPrivateTerms(p.id) ? "arrowUp" : "lock"}
                          size={15}
                        />
                      </button>
                    </div>
                  ))}
                  <div className="automation-note">
                    <Icon name="spark" size={14} />
                    {t(
                      "These drafts follow the brief. A material change invalidates earlier approvals.",
                      "As minutas seguem o briefing. Alterações relevantes invalidam aprovações anteriores.",
                    )}
                  </div>
                </section>
                <p className="quiet-note">
                  {t(
                    "Drafts need local legal review and complete booking terms before real use. Demo approvals are browser-local workflow records, not signatures. Photographer copyright, likeness, performance, and third-party permissions remain separate.",
                    "Minutas exigem revisão jurídica local e termos completos antes do uso real. Aprovações demo são registros locais, não assinaturas. Direitos autorais, imagem, interpretação e autorizações de terceiros permanecem distintos.",
                  )}
                </p>
              </div>
            )}

            {view === "payments" && (
              <div className="page-enter">
                <div className="payment-intro">
                  <div>
                    <Tag tone="pending">
                      {t("PAYMENT SIMULATION", "SIMULAÇÃO DE PAGAMENTOS")}
                    </Tag>
                    <h2>
                      {t(
                        "Good work deserves clear payment.",
                        "Trabalho bem feito merece pagamento claro.",
                      )}
                    </h2>
                    <p>
                      {t(
                        "A visible plan for who gets paid, when, and why. No money moves in this prototype.",
                        "Um plano visível de quem recebe, quando e por quê. Nenhum valor é movimentado neste protótipo.",
                      )}
                    </p>
                  </div>
                  <Icon name="wallet" size={46} />
                </div>
                <div className="payment-metrics">
                  <div>
                    <span>
                      {seesFinance
                        ? t("SERVICE BUDGET", "ORÇAMENTO DE SERVIÇOS")
                        : t("YOUR SERVICE FEE", "SEUS HONORÁRIOS")}
                    </span>
                    <strong>{money(displayedBudget, lang)}</strong>
                  </div>
                  <div>
                    <span>{t("SIMULATED FUNDING", "APORTE SIMULADO")}</span>
                    <strong>
                      {money(c.funded ? displayedBudget : 0, lang)}
                    </strong>
                  </div>
                  <div>
                    <span>
                      {actor.role === "client" && !isOwner
                        ? t("PLATFORM FEE", "TAXA DA PLATAFORMA")
                        : t("SIMULATED PAYOUTS", "REPASSES SIMULADOS")}
                    </span>
                    <strong>
                      {money(
                        actor.role === "client" && !isOwner
                          ? platformFee(c)
                          : displayedPaid,
                        lang,
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>
                      {actor.role === "client" && !isOwner
                        ? t("CLIENT TOTAL", "TOTAL DO CLIENTE")
                        : t("REMAINING TO RELEASE", "A LIBERAR")}
                    </span>
                    <strong>
                      {money(
                        actor.role === "client" && !isOwner
                          ? budget + platformFee(c)
                          : c.funded
                            ? displayedBudget - displayedPaid
                            : 0,
                        lang,
                      )}
                    </strong>
                  </div>
                </div>
                <section className="panel payment-summary">
                  <div>
                    <h2>{modeText}</h2>
                    <p>
                      {c.mode === "platform"
                        ? t(
                            "An illustrative 5% platform fee is added to the client bill once. The agreed service fees stay intact.",
                            "Uma taxa ilustrativa de 5% é adicionada uma vez à conta do cliente. Os honorários combinados são preservados.",
                          )
                        : c.mode === "external"
                          ? t(
                              "Coordination is free. External payments are not verified or protected by this prototype.",
                              "A coordenação é gratuita. Pagamentos externos não são verificados nem protegidos por este protótipo.",
                            )
                          : t(
                              "No service fees and no transaction fee. Everyone explicitly agrees to the unpaid arrangement.",
                              "Sem honorários nem taxa de transação. Todos concordam expressamente com a colaboração não remunerada.",
                            )}
                    </p>
                    <p className="quiet-note">
                      {t(
                        "Processing charges, taxes, insurance, expenses, and FX are excluded. This demo is not escrow.",
                        "Processamento, tributos, seguro, despesas e câmbio não incluídos. Esta demo não é escrow.",
                      )}
                    </p>
                  </div>
                  {seesFinance ? (
                    <div className="payment-total">
                      <div>
                        <span>{t("Service fees", "Honorários")}</span>
                        <span>{money(budget, lang)}</span>
                      </div>
                      <div>
                        <span>
                          {t(
                            "Platform fee · illustrative",
                            "Taxa da plataforma · ilustrativa",
                          )}
                        </span>
                        <span>{money(platformFee(c), lang)}</span>
                      </div>
                      <div className="total">
                        <strong>{t("Client total", "Total do cliente")}</strong>
                        <strong>{money(budget + platformFee(c), lang)}</strong>
                      </div>
                      {c.mode === "platform" && (
                        <Button
                          icon={c.funded ? "check" : "wallet"}
                          disabled={
                            c.funded ||
                            !allApproved(c) ||
                            budget <= 0 ||
                            (!isOwner && actor.role !== "client")
                          }
                          onClick={() => act({ type: "fund" })}
                        >
                          {c.funded
                            ? t("Funding simulated", "Aporte simulado")
                            : t(
                                "Simulate client funding",
                                "Simular aporte do cliente",
                              )}
                        </Button>
                      )}
                      {!allApproved(c) && c.mode === "platform" && (
                        <small>
                          {t(
                            "Everyone must approve before funding.",
                            "Todos devem aprovar antes do aporte.",
                          )}
                        </small>
                      )}
                    </div>
                  ) : (
                    <div className="payment-total">
                      <div>
                        <span>
                          {t(
                            "Your agreed service fee",
                            "Seus honorários combinados",
                          )}
                        </span>
                        <strong>{money(displayedBudget, lang)}</strong>
                      </div>
                      <div>
                        <span>{t("Platform fee", "Taxa da plataforma")}</span>
                        <span>
                          {t("Paid by the client", "Paga pelo cliente")}
                        </span>
                      </div>
                      <div className="total">
                        <strong>
                          {t("Funding status", "Status do aporte")}
                        </strong>
                        <span>
                          {c.funded
                            ? t(
                                "Simulated funding confirmed",
                                "Aporte simulado confirmado",
                              )
                            : t("Not funded", "Sem aporte")}
                        </span>
                      </div>
                      <p className="quiet-note">
                        {t(
                          "Other rates, campaign totals, and private agreements are outside your view.",
                          "Outros honorários, totais da campanha e acordos privados não fazem parte da sua visão.",
                        )}
                      </p>
                    </div>
                  )}
                </section>
                <section className="panel milestones">
                  <div className="section-heading">
                    <h2>
                      {t(
                        "A milestone for each promise.",
                        "Uma etapa para cada compromisso.",
                      )}
                    </h2>
                    <Tag>{t("DEMO", "DEMO")}</Tag>
                  </div>
                  {actor.role === "client" &&
                    !isOwner &&
                    c.mode !== "unpaid" && (
                      <div className="empty-note">
                        <Icon name="lock" size={26} />
                        <h3>
                          {t(
                            "Individual rates stay private.",
                            "Honorários individuais são privados.",
                          )}
                        </h3>
                        <p>
                          {t(
                            "You can approve the team’s handovers without access to their personal commercial terms.",
                            "Você pode aprovar as entregas sem acessar os termos comerciais individuais.",
                          )}
                        </p>
                        <Button secondary onClick={() => go("people")}>
                          {t("Review handovers", "Revisar entregas")}
                        </Button>
                      </div>
                    )}
                  {c.mode === "unpaid" ? (
                    <div className="empty-note">
                      <Icon name="leaf" size={28} />
                      <h3>
                        {t(
                          "Creating together, without a fee.",
                          "Criando juntos, sem honorários.",
                        )}
                      </h3>
                      <p>
                        {t(
                          "Agreements, schedules, and participation records still matter.",
                          "Acordos, programação e registros de participação continuam importantes.",
                        )}
                      </p>
                    </div>
                  ) : (
                    visiblePayees(c, actor.id).map((p) => (
                      <div className="payee-block" key={p.id}>
                        <div className="payee-heading">
                          <Avatar person={p} small />
                          <div>
                            <strong>{p.name}</strong>
                            <small>{roleLabel[p.role][lang]}</small>
                          </div>
                          <strong>{money(p.fee, lang)}</strong>
                        </div>
                        <div className="milestone-grid">
                          {(["session", "delivery"] as const).map((m) => {
                            const paid =
                              m === "session" ? p.sessionPaid : p.deliveryPaid;
                            const block = releaseBlock(c, p, m);
                            return (
                              <div className="milestone" key={m}>
                                <div>
                                  <span
                                    className={`milestone-symbol ${paid ? "complete" : ""}`}
                                  >
                                    <Icon
                                      name={
                                        paid
                                          ? "check"
                                          : m === "session"
                                            ? "pin"
                                            : "document"
                                      }
                                      size={16}
                                    />
                                  </span>
                                  <span>
                                    <strong>
                                      {m === "session"
                                        ? t(
                                            "Session complete · 50%",
                                            "Sessão concluída · 50%",
                                          )
                                        : t(
                                            "Handover approved · 50%",
                                            "Entrega aprovada · 50%",
                                          )}
                                    </strong>
                                    <small>
                                      {c.mode === "external"
                                        ? t(
                                            "Managed outside the platform",
                                            "Gerenciado fora da plataforma",
                                          )
                                        : paid
                                          ? t(
                                              "Payout simulated",
                                              "Repasse simulado",
                                            )
                                          : block === "funding"
                                            ? t(
                                                "Waiting for funding",
                                                "Aguardando aporte",
                                              )
                                            : block === "approval"
                                              ? t(
                                                  "Waiting for current approvals",
                                                  "Aguardando aprovações atuais",
                                                )
                                              : block === "evidence"
                                                ? m === "session"
                                                  ? t(
                                                      "Needs arrival + completed shoot",
                                                      "Exige chegada + sessão concluída",
                                                    )
                                                  : t(
                                                      "Needs handover + client approval",
                                                      "Exige entrega + aprovação do cliente",
                                                    )
                                                : t(
                                                    "Ready to release · demo",
                                                    "Pronto para liberar · demo",
                                                  )}
                                    </small>
                                  </span>
                                </div>
                                <div className="milestone-amount">
                                  <strong>{money(p.fee / 2, lang)}</strong>
                                  <Button
                                    secondary
                                    disabled={
                                      !!block ||
                                      (!isOwner && actor.role !== "client")
                                    }
                                    onClick={() =>
                                      act({
                                        type: "release",
                                        personId: p.id,
                                        milestone: m,
                                      })
                                    }
                                  >
                                    {paid
                                      ? t("Simulated", "Simulado")
                                      : t(
                                          "Simulate release",
                                          "Simular liberação",
                                        )}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </section>
              </div>
            )}

            {view === "activity" && (
              <div className="page-enter">
                <div className="intro-row">
                  <p>
                    {t(
                      "A shared record of what changed, who approved, and what happens next. Demo records are editable local data, not an authenticated audit trail.",
                      "Um registro em comum de alterações, aprovações e próximos passos. Registros demo são dados locais editáveis, não uma trilha autenticada.",
                    )}
                  </p>
                  <Tag>
                    {activity.length} {t("UPDATES", "ATUALIZAÇÕES")}
                  </Tag>
                </div>
                <section className="panel activity-panel">
                  {activity.map((event) => (
                    <div className="activity-event" key={event.id}>
                      <span className={`event-icon ${event.kind}`}>
                        <Icon
                          name={
                            event.kind === "agreement"
                              ? "document"
                              : event.kind === "payment"
                                ? "wallet"
                                : event.kind === "schedule"
                                  ? "calendar"
                                  : "spark"
                          }
                          size={18}
                        />
                      </span>
                      <div>
                        <strong>{event.actor}</strong>
                        <p>{event[lang]}</p>
                        <time dateTime={event.at}>
                          {new Intl.DateTimeFormat(
                            lang === "en" ? "en-GB" : "pt-BR",
                            {
                              dateStyle: "medium",
                              timeStyle: "short",
                              timeZone: c.timezone,
                            },
                          ).format(new Date(event.at))}{" "}
                          · {c.timezone}
                        </time>
                      </div>
                    </div>
                  ))}
                </section>
              </div>
            )}

            <footer className="page-footer">
              <span className="footer-brand">
                champaign<span>✳</span>
              </span>
              <p>
                {t(
                  "Good things happen when everyone’s on the same page.",
                  "Coisas boas acontecem quando todos estão alinhados.",
                )}
              </p>
              <button onClick={() => setModal({ type: "reset" })}>
                <Icon name="reset" size={13} />
                {t("Reset demo", "Reiniciar demo")}
              </button>
            </footer>
          </main>
        </div>
      </div>
      {modal && (
        <Dialog
          title={
            modal.type === "brief"
              ? t(
                  "A clear brief. A good beginning.",
                  "Um briefing claro. Um bom começo.",
                )
              : modal.type === "create"
                ? t(
                    "Make room for the next idea.",
                    "Dê espaço à próxima ideia.",
                  )
                : modal.type === "person"
                  ? t(
                      "Bring someone into the picture.",
                      "Traga alguém para a criação.",
                    )
                  : modal.type === "agreement"
                    ? t("Read it. Make it yours.", "Leia. Decida com clareza.")
                    : modal.type === "callSheet"
                      ? t("The day, on one page.", "O dia em uma página.")
                      : modal.type === "privacy"
                        ? t(
                            "The right details. The right people.",
                            "Os dados certos. As pessoas certas.",
                          )
                        : modal.type === "reset"
                          ? t("Start fresh?", "Começar de novo?")
                          : t("Meet Champaign.", "Conheça o Champaign.")
          }
          close={() => setModal(null)}
          wide={["brief", "create", "agreement", "callSheet"].includes(
            modal.type,
          )}
        >
          {(modal.type === "brief" || modal.type === "create") && (
            <BriefForm
              campaign={c}
              lang={lang}
              creating={modal.type === "create"}
              close={() => setModal(null)}
              onSubmit={(input) => {
                if (modal.type === "create") {
                  const campaign = newCampaign(input);
                  setWorkspace((w) => ({
                    ...w,
                    campaigns: [...w.campaigns, campaign],
                    activeId: campaign.id,
                    actorId: ownerId,
                  }));
                  setModal(null);
                  go("overview");
                  notify(
                    t(
                      "Campaign created. Agreements, schedule, and milestones are ready to review.",
                      "Campanha criada. Acordos, programação e parcelas prontos para revisão.",
                    ),
                  );
                } else if (act({ type: "brief", input })) setModal(null);
              }}
            />
          )}
          {modal.type === "person" && (
            <form
              className="form"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                if (
                  act({
                    type: "addPerson",
                    name: String(data.get("name")),
                    role: String(data.get("role")) as Role,
                    fee: Number(data.get("fee")),
                  })
                )
                  setModal(null);
              }}
            >
              <p className="muted">
                {t(
                  "This adds a sample collaborator and generates their draft agreement. It does not send an invitation or verify their identity.",
                  "Adiciona uma pessoa de exemplo e gera sua minuta. Não envia convite nem verifica identidade.",
                )}
              </p>
              <label>
                {t("Full name", "Nome completo")}
                <input name="name" required maxLength={80} />
              </label>
              <label>
                {t("Role", "Função")}
                <select name="role">
                  {(Object.keys(roleLabel) as Role[])
                    .filter((role) => role !== "client")
                    .map((role) => (
                      <option value={role} key={role}>
                        {roleLabel[role][lang]}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                {t("Service fee · BRL", "Honorários · BRL")}
                <input
                  name="fee"
                  type="number"
                  min="0"
                  max="1000000"
                  step="1"
                  required
                  defaultValue="0"
                  disabled={c.mode === "unpaid"}
                />
              </label>
              <p className="quiet-note">
                {t(
                  "Adding a person changes the shared budget and creates a new version for everyone to approve.",
                  "Adicionar uma pessoa altera o orçamento e cria nova versão para aprovação de todos.",
                )}
              </p>
              <div className="form-footer">
                <Button type="submit" icon="plus">
                  {t("Add to the campaign", "Adicionar à campanha")}
                </Button>
              </div>
            </form>
          )}
          {modal.type === "agreement" &&
            (() => {
              const p = c.people.find((p) => p.id === modal.personId)!;
              return (
                <>
                  <div className="document-meta">
                    <Avatar person={p} small />
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        {roleLabel[p.role][lang]} / v{c.revision}
                      </small>
                    </span>
                    <Tag tone="pending">
                      {t("DRAFT · DEMO", "MINUTA · DEMO")}
                    </Tag>
                  </div>
                  <div className="document-warning">
                    {t(
                      "For review, not signature. This draft needs completed terms and local legal review before real use.",
                      "Para revisão, não assinatura. A minuta precisa de termos completos e revisão jurídica local antes do uso real.",
                    )}
                  </div>
                  <pre className="document-preview">
                    {agreement(c, p, lang, actor.id)}
                  </pre>
                  <div className="document-actions">
                    <Button
                      secondary
                      icon="download"
                      disabled={!hasPrivateTerms(p.id)}
                      onClick={() => print(agreement(c, p, lang, actor.id))}
                    >
                      {t("Print / save PDF", "Imprimir / salvar PDF")}
                    </Button>
                    {actor.id === p.id ? (
                      <Button
                        icon="check"
                        disabled={approved(c, p)}
                        onClick={() => {
                          if (act({ type: "approve" })) setModal(null);
                        }}
                      >
                        {approved(c, p)
                          ? t("Approved in demo", "Aprovado na demo")
                          : t(
                              "Approve these terms · demo",
                              "Aprovar estes termos · demo",
                            )}
                      </Button>
                    ) : (
                      <p className="muted small-text">
                        {t(
                          "Only this participant can approve. Use the demo view selector to preview their role.",
                          "Só esta pessoa pode aprovar. Use o seletor de visão demo para ver sua função.",
                        )}
                      </p>
                    )}
                  </div>
                </>
              );
            })()}
          {modal.type === "callSheet" && (
            <>
              <pre className="document-preview">{callSheet(c, lang)}</pre>
              <div className="document-actions">
                <Button
                  icon="download"
                  onClick={() => print(callSheet(c, lang))}
                >
                  {t("Print / save PDF", "Imprimir / salvar PDF")}
                </Button>
              </div>
            </>
          )}
          {modal.type === "reset" && (
            <div className="form">
              <p>
                {t(
                  "This replaces every campaign in this browser with the original sample. Export each campaign first if you want to keep its details.",
                  "Isto substitui todas as campanhas deste navegador pelo exemplo inicial. Exporte cada campanha antes se quiser preservar seus dados.",
                )}
              </p>
              <div className="form-footer">
                <Button secondary icon="download" onClick={download}>
                  {t("Export first", "Exportar antes")}
                </Button>
                <Button
                  onClick={() => {
                    setWorkspace(createWorkspace());
                    setStorageEnabled(true);
                    setModal(null);
                    go("overview");
                    notify(
                      t(
                        "The demo is ready for a fresh start.",
                        "A demo está pronta para recomeçar.",
                      ),
                    );
                  }}
                >
                  {t("Replace with sample", "Substituir pelo exemplo")}
                </Button>
              </div>
            </div>
          )}
          {modal.type === "privacy" && (
            <div className="form privacy-copy">
              <p>
                {t(
                  "Coordination is shared. Commercial terms are private by default. Naya has coordinator access in this demo; job titles alone do not grant that access.",
                  "A coordenação é compartilhada. Termos comerciais são privados por padrão. Naya tem acesso de coordenação nesta demo; o título da função não concede esse acesso.",
                )}
              </p>
              <div className="privacy-matrix">
                <table>
                  <thead>
                    <tr>
                      <th>{t("Information", "Informação")}</th>
                      <th>{t("Who can see it", "Quem pode ver")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [
                        t(
                          "Goal, location, roster, schedule, shared usage limits",
                          "Objetivo, local, equipe, programação e limites de uso",
                        ),
                        t("Everyone on the campaign", "Todos na campanha"),
                      ],
                      [
                        t(
                          "Individual rates & personal agreements",
                          "Honorários e acordos individuais",
                        ),
                        t(
                          "Coordinator + that participant",
                          "Coordenação + a própria pessoa",
                        ),
                      ],
                      [
                        t(
                          "Client quote & platform fee",
                          "Orçamento do cliente e taxa da plataforma",
                        ),
                        t("Coordinator + client", "Coordenação + cliente"),
                      ],
                      [
                        t(
                          "Individual payment milestones & payout history",
                          "Parcelas e histórico de repasses individuais",
                        ),
                        t(
                          "Coordinator + that participant",
                          "Coordenação + a própria pessoa",
                        ),
                      ],
                      [
                        t(
                          "Funding status, approval & delivery status",
                          "Status de aporte, aprovações e entregas",
                        ),
                        t(
                          "Everyone; private amounts stay hidden",
                          "Todos; valores privados ficam ocultos",
                        ),
                      ],
                      [
                        t(
                          "Exports & printable documents",
                          "Exportações e documentos impressos",
                        ),
                        t(
                          "Only details allowed for the current view",
                          "Apenas os dados permitidos para a visão atual",
                        ),
                      ],
                    ].map(([label, value]) => (
                      <tr key={label}>
                        <td>{label}</td>
                        <td>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="about-boundary">
                <Icon name="lock" />
                <p>
                  {t(
                    "These rules apply to the demo’s interface, generated documents, activity, and exports. Every sample record still lives in this browser, and anyone can switch demo views. Real privacy needs authenticated accounts and permission checks on the server before records are sent.",
                    "Estas regras valem para interface, documentos gerados, atividade e exportações da demo. Todos os registros de exemplo continuam neste navegador, e qualquer pessoa pode alternar as visões demo. Privacidade real exige contas autenticadas e verificação de permissões no servidor antes do envio dos dados.",
                  )}
                </p>
              </div>
            </div>
          )}
          {modal.type === "about" && (
            <div className="form about-copy">
              <div className="about-wordmark">
                champaign<span>✳</span>
              </div>
              <p className="about-lead">
                {t(
                  "A shared home for the people, plans, and promises behind creative work.",
                  "Um lugar para as pessoas, os planos e os compromissos por trás do trabalho criativo.",
                )}
              </p>
              <ol>
                <li>
                  <strong>{t("Make a plan.", "Crie um plano.")}</strong>{" "}
                  {t(
                    "The brief prepares agreements, a call sheet, and milestones.",
                    "O briefing prepara acordos, ordem do dia e parcelas.",
                  )}
                </li>
                <li>
                  <strong>
                    {t("Get everyone aligned.", "Alinhe a equipe.")}
                  </strong>{" "}
                  {t(
                    "Switch demo views to review each person’s terms.",
                    "Alterne as visões demo para revisar os termos de cada pessoa.",
                  )}
                </li>
                <li>
                  <strong>
                    {t("Try the whole journey.", "Experimente todo o caminho.")}
                  </strong>{" "}
                  {t(
                    "Approve → simulate funding → check in each crew member → coordinator confirms wrap → submit handovers → client approves → simulate releases.",
                    "Aprovar → simular aporte → check-in da equipe → coordenação encerra → enviar entregas → cliente aprova → simular repasses.",
                  )}
                </li>
              </ol>
              <div className="about-boundary">
                <Icon name="lock" />
                <p>
                  {t(
                    "Browser-local prototype. No real accounts, messages, signatures, payments, escrow, identity checks, or background automation. Fictional brand and collaborators; no existing client relationship is implied. Do not enter sensitive information.",
                    "Protótipo local no navegador. Sem contas reais, mensagens, assinaturas, pagamentos, escrow, verificação de identidade ou automação em segundo plano. Marca e equipe fictícias; não implica relação com clientes existentes. Não insira informações sensíveis.",
                  )}
                </p>
              </div>
              <p>
                {t(
                  "The software is open source. Coordination is free; platform payments would carry a clearly disclosed fee. The 5% rate here is illustrative.",
                  "O software é de código aberto. A coordenação é gratuita; pagamentos pela plataforma teriam taxa divulgada. A taxa de 5% aqui é ilustrativa.",
                )}
              </p>
              <a
                className="text-button"
                href="https://github.com/henrylove0/Champaign"
                target="_blank"
                rel="noreferrer"
              >
                {t("Explore the source", "Ver código-fonte")}
                <Icon name="arrowUp" size={16} />
              </a>
            </div>
          )}
        </Dialog>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>
            <Icon name="check" size={17} />
          </span>
          {toast}
          <button
            aria-label={t("Dismiss", "Fechar")}
            onClick={() => setToast("")}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
      <pre className="print-only">{printText}</pre>
    </>
  );
}
