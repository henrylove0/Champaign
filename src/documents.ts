import {
  campaignBudget,
  dateLabel,
  money,
  platformFee,
  roleLabel,
} from "./model.ts";
import type { Campaign, Language, Person, Role } from "./model.ts";
import { canSeeCampaignFinance, canSeePersonalTerms } from "./permissions.ts";

export function agreement(
  c: Campaign,
  p: Person,
  lang: Language,
  viewerId: string,
): string {
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);
  if (!canSeePersonalTerms(c, viewerId, p.id))
    return t(
      "Private agreement. You do not have access to this participant’s commercial terms.",
      "Acordo privado. Você não tem acesso aos termos comerciais desta pessoa.",
    );
  const fee = c.mode === "unpaid" ? 0 : p.fee;
  const duties: Record<Role, string> = {
    model: t(
      "Attend the booked session and perform the agreed modeling. Handover means confirming the session and any agreed releases; it does not make the model responsible for editing photographs or films.",
      "Comparecer à sessão e realizar o trabalho de modelo combinado. A entrega significa confirmar a sessão e as autorizações acordadas; não torna a modelo responsável por editar fotos ou filmes.",
    ),
    actor: t(
      "Perform the specifically agreed scenes. Script, dialogue, rehearsal, intimacy/stunt boundaries, and performance uses require express agreement; no new synthetic performance is implied.",
      "Interpretar as cenas especificamente combinadas. Roteiro, falas, ensaio, limites de intimidade/risco e usos da interpretação exigem acordo expresso; não se presume nova performance sintética.",
    ),
    photographer: t(
      "Capture the agreed photographic material. Final selections, edit count, file format, delivery deadline, and photographic license must be specified before signature.",
      "Capturar o material fotográfico combinado. Seleção, quantidade de edições, formato, prazo de entrega e licença autoral devem ser definidos antes da assinatura.",
    ),
    videographer: t(
      "Capture and edit only the agreed moving-image deliverables. Confirm shot list, duration, aspect ratios, audio/music clearances, revision rounds, and delivery deadlines.",
      "Capturar e editar apenas os vídeos combinados. Confirmar planos, duração, proporções, licenças de áudio/música, revisões e prazos de entrega.",
    ),
    makeup: t(
      "Provide the agreed hair and makeup service, kit, and on-set support. Handover means confirming the service, not delivering edited campaign media.",
      "Prestar os serviços combinados de cabelo e maquiagem, materiais e acompanhamento. A entrega confirma o serviço; não exige fornecer a mídia editada da campanha.",
    ),
    stylist: t(
      "Prepare the agreed wardrobe and styling. Confirm fittings, borrowing permissions, purchase/return responsibilities, expenses, and damage terms.",
      "Preparar figurino e styling combinados. Confirmar provas, permissões de empréstimo, compras/devoluções, despesas e responsabilidade por danos.",
    ),
    producer: t(
      "Coordinate the agreed production tasks. Confirm staffing, location authority, logistics, safety contacts, insurance responsibilities, and approved expenses.",
      "Coordenar as tarefas de produção combinadas. Confirmar equipe, autorização do local, logística, contatos de segurança, responsabilidades por seguro e despesas aprovadas.",
    ),
    client: t(
      "Supply the agreed brief and approvals, fund or pay the agreed fees on time, and use only properly licensed outputs. Review handovers against agreed objective criteria and deadlines.",
      "Fornecer briefing e aprovações, aportar ou pagar os valores no prazo e usar apenas materiais licenciados. Revisar entregas por critérios objetivos e prazos combinados.",
    ),
  };
  return [
    t(
      "CHAMPAIGN / PERSONAL CAMPAIGN AGREEMENT",
      "CHAMPAIGN / ACORDO INDIVIDUAL DE CAMPANHA",
    ),
    t(
      "DRAFT FOR REVIEW · PROTOTYPE · NOT A SIGNED CONTRACT",
      "MINUTA PARA REVISÃO · PROTÓTIPO · NÃO É CONTRATO ASSINADO",
    ),
    `${c.title} / ${t("Version", "Versão")} ${c.revision}`,
    "",
    t("01 / THE PARTIES & THE PURPOSE", "01 / AS PARTES E O OBJETIVO"),
    `${t("Client", "Cliente")}: ${c.client}. ${t("Participant", "Participante")}: ${p.name} (${roleLabel[p.role][lang]}).`,
    c.goal,
    "",
    t("INDIVIDUAL ROLE SCOPE", "ESCOPO DA FUNÇÃO INDIVIDUAL"),
    duties[p.role],
    "",
    t("02 / WHEN & WHERE", "02 / QUANDO E ONDE"),
    `${dateLabel(c.date, lang)}. ${c.location}. ${c.address}. ${c.timezone}.`,
    ...c.schedule.map(
      (i) => `${i.time} — ${lang === "en" ? i.title : i.titlePt}`,
    ),
    "",
    t(
      "03 / FEES & RELEASE CONDITIONS",
      "03 / HONORÁRIOS E CONDIÇÕES DE LIBERAÇÃO",
    ),
    `${t("Agreed service fee", "Honorários combinados")}: ${money(fee, lang)}.`,
    c.mode === "platform"
      ? t(
          "Demonstration terms: 50% after attendance and completed session; 50% after agreed handover and client approval. Client funds the campaign before work. No indefinite client veto: a real contract must set acceptance deadlines, objective rejection grounds, and dispute resolution before signature.",
          "Termos demonstrativos: 50% após presença e sessão concluída; 50% após entrega combinada e aprovação do cliente. O cliente aporta os valores antes do trabalho. Sem veto indefinido: o contrato real deve prever prazos de aceite, motivos objetivos de rejeição e resolução de disputas antes da assinatura.",
        )
      : c.mode === "external"
        ? t(
            "Payment takes place outside Champaign. This draft does not set the channel or due date; agree both in a reviewed contract. No platform funding verification or payment protection is provided.",
            "O pagamento ocorre fora do Champaign. Esta minuta não define o canal nem o vencimento; acordem ambos em contrato revisado. Não há verificação de aporte nem proteção de pagamento pela plataforma.",
          )
        : t(
            "This is an unpaid collaboration. No participant service fee or platform transaction fee applies. Any expenses, credits, and deliverable access must be agreed explicitly before work.",
            "Esta é uma colaboração não remunerada. Não há honorários de participantes nem taxa de transação. Despesas, créditos e acesso às entregas devem ser combinados expressamente antes do trabalho.",
          ),
    ...(canSeeCampaignFinance(c, p.id)
      ? [
          `${t("Campaign service budget", "Orçamento de serviços")}: ${money(campaignBudget(c), lang)}. ${t("Illustrative client-paid platform fee", "Taxa ilustrativa paga pelo cliente")}: ${money(platformFee(c), lang)}.`,
        ]
      : [
          t(
            "Other participants’ fees and the client’s total budget are private. The shared funding status does not disclose those amounts.",
            "Os honorários de outras pessoas e o orçamento total do cliente são privados. O status compartilhado do aporte não revela esses valores.",
          ),
        ]),
    t(
      "Processing charges, taxes, insurance, expenses, and currency conversion are not included in this prototype. Service fees are not silently reduced by the platform fee.",
      "Processamento, tributos, seguro, despesas e câmbio não estão incluídos neste protótipo. A taxa da plataforma não reduz os honorários acordados.",
    ),
    "",
    t("04 / USAGE & LIKENESS", "04 / USO E IMAGEM"),
    `${t("Channels", "Canais")}: ${c.usage}`,
    `${t("Term", "Prazo")}: ${c.term}. ${t("Territory", "Território")}: ${c.territory}.`,
    c.aiAllowed
      ? t(
          "AI use is requested, but this checkbox does not grant it. A separately negotiated, specific addendum identifying the uses, inputs, outputs, compensation, duration, and approvals is required. No AI permission is granted by this draft.",
          "O uso de IA foi solicitado, mas esta opção não o autoriza. É necessário aditivo específico e negociado com usos, insumos, resultados, remuneração, duração e aprovações. Esta minuta não concede permissão de IA.",
        )
      : t(
          "No AI training, synthetic likeness, voice/body replication, face swaps, virtual wardrobe changes, or creation of new performances is permitted without a separate, specific written agreement with the relevant rightsholders.",
          "Sem treinamento de IA, imagem sintética, réplica de voz/corpo, troca de rosto, alteração virtual de roupas ou criação de novas performances sem acordo escrito separado e específico com os respectivos titulares.",
        ),
    t(
      "Photographic copyright, performance rights, likeness rights, and third-party clearances are separate. This draft does not transfer photographic copyright or imply that a participant owns all campaign rights. Confirm the actual license chain before publication.",
      "Direitos autorais das fotografias, direitos de interpretação, imagem e autorizações de terceiros são distintos. Esta minuta não transfere direitos autorais nem presume que um participante detenha todos os direitos. Confirme a cadeia de licenças antes da publicação.",
    ),
    "",
    t(
      "05 / CANCELLATION, CHANGES & SAFETY",
      "05 / CANCELAMENTO, ALTERAÇÕES E SEGURANÇA",
    ),
    c.cancellation,
    t(
      "Material changes require a new version and fresh participant approvals. Unsafe activity may be paused; check-in alone is not acceptance of unsafe work or a waiver of rights.",
      "Alterações relevantes exigem nova versão e novas aprovações. Atividades inseguras podem ser interrompidas; check-in não é aceite de trabalho inseguro nem renúncia de direitos.",
    ),
    "",
    t("06 / BEFORE THIS CAN BE SIGNED", "06 / ANTES DA ASSINATURA"),
    t(
      "Verify party identities and authority, exact role deliverables and dates, expenses and overtime, local work/tax rules, insurance, copyright ownership and releases, acceptance deadlines, dispute process, governing law, and a compliant signature method with local counsel. These remain unresolved by this prototype.",
      "Verifique com assessoria local: identidade e poderes das partes, entregas e datas por função, despesas e horas extras, regras locais de trabalho e tributos, seguro, titularidade e autorizações, prazos de aceite, disputas, lei aplicável e assinatura adequada. Este protótipo não resolve esses pontos.",
    ),
    "",
    t(
      "Demo approvals record a workflow choice on this browser. They are neither authenticated signatures nor evidence of agreement by a real third party.",
      "Aprovações de demonstração registram uma escolha de fluxo neste navegador. Não são assinaturas autenticadas nem prova de concordância de terceiros reais.",
    ),
  ].join("\n");
}

export function callSheet(c: Campaign, lang: Language): string {
  const t = (en: string, pt: string) => (lang === "en" ? en : pt);
  return [
    "CHAMPAIGN / " + t("CALL SHEET", "ORDEM DO DIA"),
    t(
      "DEMO · SAMPLE CONTACTS AND LOCATION · CONFIRM BEFORE TRAVEL",
      "DEMO · EQUIPE E LOCAL DE EXEMPLO · CONFIRME ANTES DE VIAJAR",
    ),
    `${c.title} / v${c.revision}`,
    `${c.client} / ${dateLabel(c.date, lang)}`,
    `${c.location}\n${c.address}\n${c.timezone}`,
    "",
    t("PURPOSE", "OBJETIVO"),
    c.goal,
    "",
    t("PEOPLE", "EQUIPE"),
    ...c.people.map((p) => `${p.name} / ${roleLabel[p.role][lang]}`),
    "",
    t("SCHEDULE · LOCAL TIME", "PROGRAMAÇÃO · HORÁRIO LOCAL"),
    ...c.schedule.map(
      (i) =>
        `${i.time} / ${lang === "en" ? i.title : i.titlePt} / ${c.people.find((p) => p.id === i.owner)?.name ?? ""}`,
    ),
    "",
    t("SAFETY CHECK BEFORE THE SHOOT", "SEGURANÇA ANTES DA SESSÃO"),
    t(
      "Confirm exact address, location access, emergency contact and nearest hospital, travel, and participant consent. These are not verified by this demo.",
      "Confirme endereço exato, acesso, contato de emergência e hospital próximo, deslocamento e consentimento dos participantes. A demo não verifica esses itens.",
    ),
  ].join("\n");
}
