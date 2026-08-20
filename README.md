# Proposta Plus 2.0

Reconstrução do protótipo original em uma aplicação full-stack organizada, usando **Next.js 16**, **React 19**, **Prisma 7** e **PostgreSQL**.

> O `index.html` original foi mantido no repositório como referência do protótipo/fork durante a migração.

## O que já foi reconstruído

- Dashboard comercial responsivo
- Cadastro e listagem de clientes
- Criação e listagem de propostas
- Itens de proposta persistidos no PostgreSQL
- Valores, validade, observações e numeração automática
- Pipeline de status: rascunho, enviada, visualizada, aceita, recusada e expirada
- Página detalhada da proposta
- Server Actions com validação Zod
- Modelagem multi-workspace preparada via `Organization`
- Prisma 7 com driver adapter PostgreSQL
- Seed de desenvolvimento

## Arquitetura

```text
src/
  app/
    clientes/
    propostas/
    actions.ts
    globals.css
    layout.tsx
    page.tsx
  components/
    sidebar.tsx
  lib/
    format.ts
    prisma.ts
prisma/
  schema.prisma
  seed.ts
prisma.config.ts
```

## Requisitos

- Node.js 20.19+ (recomendado Node 22 LTS ou superior)
- PostgreSQL

## Instalação

```bash
npm install
cp .env.example .env
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

Acesse `http://localhost:3000`.

## Banco de dados

Configure `DATABASE_URL` no `.env`:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/proposta_plus"
```

O projeto pode usar PostgreSQL local ou serviços compatíveis, como Prisma Postgres, Neon, Supabase e Railway.

## Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```

## Próximas etapas recomendadas

1. Migrar as regras específicas ainda existentes no HTML legado.
2. Adicionar autenticação e papéis de usuário.
3. Implementar editor completo de propostas com múltiplos itens no formulário.
4. Criar visualização pública por token e rastreamento de abertura.
5. Gerar PDF e compartilhar proposta por e-mail/WhatsApp.
6. Adicionar templates, produtos/serviços e condições comerciais reutilizáveis.
7. Implementar assinatura/aceite do cliente e histórico de eventos.

## Estratégia de migração

A nova aplicação não depende do JavaScript monolítico do `index.html`. O legado permanece somente como referência até que todos os fluxos úteis sejam identificados e migrados para módulos Next.js/Prisma.
