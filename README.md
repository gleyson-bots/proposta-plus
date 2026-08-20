# Proposta Plus 2.0

Reconstrução do protótipo original em uma aplicação full-stack organizada, usando **Next.js 16**, **React 19**, **Prisma 7** e **SQLite**.

> O `index.html` original foi mantido no repositório como referência do protótipo/fork durante a migração.

## Banco de dados

O projeto usa SQLite em dois modos:

- **Desenvolvimento/local:** arquivo `prisma/dev.db` com `better-sqlite3` através de `@prisma/adapter-better-sqlite3`.
- **Produção na Vercel:** Turso/libSQL através de `@prisma/adapter-libsql`.

O runtime escolhe automaticamente o adapter em `src/lib/database-adapter.ts`.

### Por que não usar o arquivo `.db` diretamente na Vercel?

As Vercel Functions possuem filesystem efêmero. Um arquivo SQLite criado ou alterado durante uma execução não é um armazenamento compartilhado e persistente para as próximas requisições/instâncias. Por isso o projeto bloqueia o fallback para `better-sqlite3` quando detecta `VERCEL` e exige `TURSO_DATABASE_URL`.

Dessa forma continuamos usando o ecossistema SQLite sem depender de PostgreSQL e sem risco de perder propostas, sessões, mensagens ou designações.

## O que já foi reconstruído

- Dashboard comercial responsivo
- Cadastro e listagem de clientes
- Criação e listagem de propostas
- Itens de proposta persistidos no SQLite
- Valores, validade, observações e numeração automática
- Pipeline de status: rascunho, enviada, visualizada, aceita, recusada e expirada
- Página detalhada da proposta
- Server Actions com validação Zod
- Modelagem multi-workspace via `Organization`
- **RBAC hierárquico com escopo aplicado no servidor**
- **Sessões de autenticação por cookie HTTP-only**
- **Webchat interno com conversas diretas e salas de equipe**
- **Designações dentro das mensagens com status de execução**
- Painel de equipe e painel administrativo de hierarquia
- Prisma 7 + SQLite local/Turso
- Seed de desenvolvimento

## RBAC e hierarquia

A cadeia padrão é:

```text
ADMIN / VP
    ↓
DIRETOR
    ↓
SUPERVISOR
    ↓
GERENTE
    ↓
CORRETOR
```

| Cargo | Escopo de clientes/propostas | Equipe | Chat | Estrutura/Admin |
|---|---|---|---|---|
| Admin | Organização inteira | Toda | Toda | Total |
| VP | Organização inteira | Toda | Toda | Total |
| Diretor | Somente a própria diretoria | Diretoria | Diretoria + superiores | Não altera estrutura |
| Supervisor | Próprio subtree hierárquico | Subordinados | Subordinados, superiores e equipe | Não |
| Gerente | Próprio subtree hierárquico | Subordinados | Subordinados, superiores e equipe | Não |
| Corretor | Somente dados próprios | — | Própria equipe + superiores | Não |

### Regras importantes

- O RBAC não depende apenas de esconder itens do menu: consultas e Server Actions validam `organizationId`, proprietário e hierarquia.
- VP/Admin possuem acesso global dentro da organização.
- Diretor não herda dados de outra diretoria.
- Supervisor e Gerente enxergam somente a árvore abaixo deles.
- Corretor não consulta dados de outro corretor fora do seu escopo.
- O painel VP/Admin impede superior de cargo igual/inferior e bloqueia ciclos hierárquicos.

## Webchat interno

Rotas principais:

```text
/chat          conversas diretas e salas de equipe
/designacoes   central de atividades designadas
/equipe        estrutura visível para o cargo atual
/admin         configuração da hierarquia, somente VP/Admin
```

O chat possui conversa direta, salas de equipe, atualização automática, cargo dos participantes e designações com status `Aberta`, `Em andamento`, `Concluída` e `Cancelada`.

## Perfis de homologação

O seed cria:

```text
corretor@metrocasas.com.br   Corretor
gerente@metrocasas.com.br    Gerente
sup@metrocasas.com.br        Supervisor
diretor@metrocasas.com.br    Diretor
vp@metrocasas.com.br         VP
admin@metrocasas.com.br      Admin
```

Durante a homologação qualquer senha não vazia é aceita. Esse mecanismo deve ser substituído por autenticação real antes da publicação aberta ao público.

## Desenvolvimento local

Requisitos:

- Node.js 20.19+ (recomendado Node 22 LTS ou superior)

```bash
npm install
cp .env.example .env
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

`.env` local:

```env
DATABASE_URL="file:./prisma/dev.db"
```

Acesse `http://localhost:3000/login`.

Também estão disponíveis:

```bash
npm run db:push
npm run db:studio
npm run typecheck
```

## Deploy na Vercel

Para produção, não envie `dev.db` para o Git e não use `file:` como banco da aplicação.

Crie/conecte um banco **Turso Cloud** no projeto da Vercel e configure:

```env
TURSO_DATABASE_URL="libsql://seu-banco.turso.io"
TURSO_AUTH_TOKEN="seu-token"
```

`DATABASE_URL` continua sendo usada pelas ferramentas locais do Prisma; o runtime da aplicação usa Turso quando `TURSO_DATABASE_URL` está presente.

Antes do primeiro deploy, aplique o schema ao banco Turso seguindo o fluxo de migrations SQLite/libSQL da sua infraestrutura.

## Arquitetura

```text
src/
  app/
    admin/
    chat/
    clientes/
    designacoes/
    equipe/
    login/
    propostas/
  components/
  lib/
    auth.ts
    database-adapter.ts
    format.ts
    prisma.ts
    rbac.ts
    scope.ts
prisma/
  schema.prisma
  seed.ts
prisma.config.ts
```

## Próximas etapas recomendadas

1. Substituir login de homologação por autenticação real.
2. Implementar realtime dedicado no webchat.
3. Adicionar notificações, anexos e menções no chat.
4. Evoluir designações com prioridade e prazo.
5. Implementar editor completo de propostas com múltiplos itens.
6. Criar proposta pública por token, tracking, PDF e aceite/assinatura.
7. Migrar as regras específicas restantes do HTML legado.
