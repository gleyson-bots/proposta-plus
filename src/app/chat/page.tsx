import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can, getChatReachableUsers, getManagedUserIds, ROLE_LABELS } from "@/lib/rbac";
import { createTeamConversation, openDirectConversation, sendInternalMessage, updateAssignmentStatus } from "@/app/actions";
import { ChatRefresh } from "@/components/chat-refresh";

export const dynamic = "force-dynamic";

const assignmentLabels = { OPEN: "Aberta", IN_PROGRESS: "Em andamento", DONE: "Concluída", CANCELED: "Cancelada" } as const;
const assignmentStatuses = ["OPEN", "IN_PROGRESS", "DONE", "CANCELED"] as const;

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const actor = await requireUser();
  const { c } = await searchParams;
  const reachableUsers = (await getChatReachableUsers(actor)).filter((user) => user.id !== actor.id);
  const managedIds = new Set(await getManagedUserIds(actor));

  const conversations = await prisma.internalConversation.findMany({
    where: { organizationId: actor.organizationId, participants: { some: { userId: actor.id } } },
    include: {
      participants: { include: { user: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const selectedId = c ?? conversations[0]?.id;
  const selected = selectedId ? await prisma.internalConversation.findFirst({
    where: { id: selectedId, organizationId: actor.organizationId, participants: { some: { userId: actor.id } } },
    include: {
      participants: { include: { user: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 120,
        include: { sender: true, assignment: { include: { assignee: true, assignedBy: true } } },
      },
    },
  }) : null;

  const titleFor = (conversation: (typeof conversations)[number]) => conversation.type === "TEAM"
    ? conversation.title ?? "Sala de equipe"
    : conversation.participants.find((participant) => participant.userId !== actor.id)?.user.name ?? "Conversa direta";

  return <>
    <ChatRefresh />
    <header className="pageHeader chatHeader">
      <div><p className="eyebrow">COMUNICAÇÃO INTERNA</p><h1>Webchat</h1><p className="subtitle">Converse com sua estrutura e transforme mensagens em designações acompanháveis.</p></div>
      <span className="scopePill">{ROLE_LABELS[actor.role]}</span>
    </header>

    <div className="chatShell">
      <aside className="chatSidebar">
        <div className="chatCreate">
          <form action={openDirectConversation}>
            <label>Nova conversa</label>
            <div className="inlineForm"><select name="targetId" required defaultValue=""><option value="" disabled>Escolha uma pessoa</option>{reachableUsers.map((user) => <option value={user.id} key={user.id}>{user.name} · {ROLE_LABELS[user.role]}</option>)}</select><button className="iconButton" type="submit">＋</button></div>
          </form>
          {can(actor.role, "team:assign") ? <details className="roomCreator"><summary>＋ Criar sala de equipe</summary><form action={createTeamConversation}><input name="title" required placeholder="Nome da sala" /><div className="participantPicker">{reachableUsers.filter((user) => managedIds.has(user.id)).map((user) => <label key={user.id}><input type="checkbox" name="participantId" value={user.id} /> <span>{user.name}<small>{ROLE_LABELS[user.role]}</small></span></label>)}</div><button className="button" type="submit">Criar sala</button></form></details> : null}
        </div>

        <div className="conversationList">
          {conversations.length === 0 ? <div className="empty small">Nenhuma conversa ainda.</div> : conversations.map((conversation) => {
            const last = conversation.messages[0];
            return <Link className={`conversationItem ${selected?.id === conversation.id ? "active" : ""}`} href={`/chat?c=${conversation.id}`} key={conversation.id}><div className="conversationAvatar">{conversation.type === "TEAM" ? "#" : titleFor(conversation).slice(0,1).toUpperCase()}</div><div><strong>{titleFor(conversation)}</strong><small>{last ? `${last.sender.name}: ${last.body}` : "Sem mensagens"}</small></div></Link>;
          })}
        </div>
      </aside>

      <section className="chatMain">
        {!selected ? <div className="chatEmpty"><div>◌</div><h2>Seu chat interno começa aqui</h2><p>Inicie uma conversa com alguém disponível no seu escopo.</p></div> : <>
          <div className="chatTopbar"><div><strong>{selected.type === "TEAM" ? selected.title : selected.participants.find((participant) => participant.userId !== actor.id)?.user.name}</strong><small>{selected.type === "TEAM" ? `${selected.participants.length} participantes` : "Conversa direta"}</small></div><div className="chatPeople">{selected.participants.slice(0,4).map((participant) => <span title={`${participant.user.name} · ${ROLE_LABELS[participant.user.role]}`} key={participant.userId}>{participant.user.name.slice(0,1)}</span>)}</div></div>
          <div className="messageList">
            {selected.messages.map((message) => {
              const mine = message.senderId === actor.id;
              return <div className={`messageRow ${mine ? "mine" : ""}`} key={message.id}><div className="messageBubble"><div className="messageAuthor">{message.sender.name}<span>{ROLE_LABELS[message.sender.role]}</span></div><p>{message.body}</p><time>{message.createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time>{message.assignment ? <div className={`assignmentBox status-${message.assignment.status}`}><div><strong>Designado para {message.assignment.assignee.name}</strong><small>por {message.assignment.assignedBy.name} · {assignmentLabels[message.assignment.status]}</small></div><div className="assignmentActions">{assignmentStatuses.filter((status) => status !== message.assignment?.status).map((status) => <form action={updateAssignmentStatus.bind(null, message.assignment!.id, status)} key={status}><button type="submit" title={assignmentLabels[status]}>{status === "DONE" ? "✓" : status === "IN_PROGRESS" ? "▶" : status === "CANCELED" ? "×" : "↺"}</button></form>)}</div></div> : null}</div></div>;
            })}
          </div>
          <form action={sendInternalMessage.bind(null, selected.id)} className="chatComposer"><textarea name="body" rows={2} required maxLength={4000} placeholder="Escreva uma mensagem para a equipe..." /><div className="composerBottom"><label>Designar <select name="assigneeId" defaultValue=""><option value="">Sem designação</option>{selected.participants.map((participant) => <option value={participant.userId} key={participant.userId}>{participant.user.name} · {ROLE_LABELS[participant.user.role]}</option>)}</select></label><button className="button" type="submit">Enviar</button></div></form>
        </>}
      </section>
    </div>
  </>;
}
