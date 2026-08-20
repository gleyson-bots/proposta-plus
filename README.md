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
- Modelagem multi-workspace via `Organization`
- **RBAC hierárquico com escopo aplicado no servidor**
- **Sessões de autenticação por cookie HTTP-only**
- **Webchat interno com conversas diretas e salas de equipe**
- **Designações dentro das mensagens com status de execução**
- Painel de equipe e painel administrativo de hierarquia
- Prisma 7 com driver adapter PostgreSQL
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

- O RBAC não depende apenas de esconder itens do menu: as consultas e Server Actions validam `organizationId`, proprietário e hierarquia.
- VP/Admin possuem acesso global dentro da organização.
- Diretor nunca herda dados de outra diretoria: o campo `directorate` é uma barreira adicional ao relacionamento de superior/subordinado.
- Supervisor e Gerente enxergam apenas a árvore abaixo deles.
- Corretor não consegue consultar dados de outro corretor fora do seu escopo.
- Dados legados sem `ownerId` ficam visíveis apenas para VP/Admin até serem atribuídos.
- O painel VP/Admin impede superior de cargo igual/inferior e bloqueia ciclos hierárquicos.

## Webchat interno

Rotas principais:

```text
/chat          conversas diretas e salas de equipe
/designacoes   central de atividades designadas
/equipe        estrutura visível para o cargo atual
/admin         configuração da hierarquia, somente VP/Admin
```

O chat possui:

- conversa direta;
- salas criadas por Gerente/Supervisor/Diretor/VP/Admin dentro do escopo permitido;
- atualização automática da tela;
- cargo de cada participante;
- designação opcional ao enviar uma mensagem;
- status `Aberta`, `Em andamento`, `Concluída` e `Cancelada`;
- central de designações com atualização de status;
- validação de participação e organização no servidor.

## Perfis de homologação

O seed cria os perfis usados no protótipo da Metrocasas:

```text
corretor@metrocasas.com.br   Corretor
gerente@metrocasas.com.br    Gerente
sup@metrocasas.com.br        Supervisor
diretor@metrocasas.com.br    Diretor
vp@metrocasas.com.br         VP
admin@metrocasas.com.br      Admin
```

**Durante a homologação qualquer senha não vazia é aceita.** Esse mecanismo é propositalmente de teste e deve ser substituído por autenticação real antes de uma publicação aberta ao público.

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
    actions.ts
    globals.css
    rbac-chat.css
    layout.tsx
    page.tsx
  components/
    chat-refresh.tsx
    sidebar.tsx
  lib/
    auth.ts
    format.ts
    prisma.ts
    rbac.ts
    scope.ts
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

Acesse `http://localhost:3000/login` e escolha um dos perfis de teste.

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

1. Substituir o login de homologação por autenticação real com hash de senha/OAuth/SSO.
2. Migrar as regras específicas ainda existentes no HTML legado.
3. Implementar editor completo de propostas com múltiplos itens no formulário.
4. Criar visualização pública por token e rastreamento de abertura.
5. Gerar PDF e compartilhar proposta por e-mail/WhatsApp.
6. Adicionar templates, produtos/serviços e condições comerciais reutilizáveis.
7. Implementar assinatura/aceite do cliente e histórico de eventos.
8. Trocar a atualização periódica do chat por transporte realtime dedicado quando a infraestrutura exigir múltiplas instâncias.

## Estratégia de migração

A nova aplicação não depende do JavaScript monolítico do `index.html`. O legado permanece somente como referência até que todos os fluxos úteis sejam identificados e migrados para módulos Next.js/Prisma.
