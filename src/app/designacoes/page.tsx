import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getManagedUserIds } from "@/lib/rbac";
import { updateAssignmentStatus } from "@/app/actions";

export const dynamic = "force-dynamic";

const labels = { OPEN: "Aberta", IN_PROGRESS: "Em andamento", DONE: "Concluída", CANCELED: "Cancelada" } as const;

export default async function AssignmentsPage() {
  const actor = await requireUser();
  const visibleIds = await getManagedUserIds(actor);
  const assignments = await prisma.chatAssignment.findMany({
    where: {
      message: { conversation: { organizationId: actor.organizationId } },
      OR: [
        { assigneeId: actor.id },
        { assignedById: actor.id },
        { assigneeId: { in: visibleIds } },
      ],
    },
    include: {
      assignee: true,
      assignedBy: true,
      message: { include: { sender: true, conversation: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return <>
    <header className="pageHeader"><div><p className="eyebrow">ACOMPANHAMENTO</p><h1>Designações</h1><p className="subtitle">Mensagens transformadas em ações, respeitando a mesma hierarquia do RBAC.</p></div><Link className="button secondary" href="/chat">Abrir chat</Link></header>
    <section className="panel">
      <div className="panelHead"><h2>Atividades visíveis</h2><span className="cellSub">{assignments.length} designação(ões)</span></div>
      {assignments.length === 0 ? <div className="empty">Nenhuma designação no seu escopo.</div> : <div className="assignmentList">{assignments.map((assignment) => <article className="assignmentCard" key={assignment.id}>
        <div className="assignmentCardMain"><div className={`assignmentStatus status-${assignment.status}`}>{labels[assignment.status]}</div><strong>{assignment.message.body}</strong><p>Responsável: <b>{assignment.assignee.name}</b> · Designado por {assignment.assignedBy.name}</p><Link href={`/chat?c=${assignment.message.conversationId}`}>Ir para a conversa →</Link></div>
        <div className="assignmentCardActions">{assignment.status !== "IN_PROGRESS" ? <form action={updateAssignmentStatus.bind(null, assignment.id, "IN_PROGRESS")}><button className="statusButton" type="submit">Iniciar</button></form> : null}{assignment.status !== "DONE" ? <form action={updateAssignmentStatus.bind(null, assignment.id, "DONE")}><button className="button" type="submit">Concluir</button></form> : null}</div>
      </article>)}</div>}
    </section>
  </>;
}
