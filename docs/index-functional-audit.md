# Auditoria funcional do `index.html` — Proposta+

Este documento transforma o `index.html` original no contrato funcional canônico durante a migração para Next.js.

## Regra de migração

Uma função original só pode deixar de ser atendida pelo motor legado quando existir uma implementação modular equivalente, validada de ponta a ponta. Alterar somente a aparência ou criar um CRUD aproximado **não** conta como paridade.

Enquanto isso:

- `/proposta` executa o `index.html` original completo dentro da sessão autenticada do Next.js;
- `/workspace` mantém a reconstrução modular em paralelo;
- login e home direcionam para o fluxo funcional canônico;
- o CI executa `npm run check:index` e falha se capacidades essenciais forem removidas do `index.html`.

## Matriz de capacidades

| Área | Capacidade original | Evidência principal no `index.html` | `/proposta` | Next modular |
| --- | --- | --- | --- | --- |
| Autenticação | Entrada no app por perfil | `enterApp`, `resolveRole`, `updateRoleUI` | Preservada | Parcial: sessão/RBAC existe |
| Perfis | Corretor, gerente, superintendente, diretor e VP | `ROLES`, `resolveRole` | Preservada | Migrada para BROKER/MANAGER/SUPERVISOR/DIRECTOR/VP/ADMIN |
| Permissões | Visibilidade e ações por função | `setRole`, `updateRoleUI` | Preservada | Parcial |
| Desktop | Navegação própria do produto | `dgo` | Preservada | Não equivalente |
| Mobile | Fluxo/telas móveis próprias | `mgo`, `applyView` | Preservada | Não equivalente |
| Propostas | Lista de propostas do corretor | `renderPropostas` | Preservada | Existe CRUD, sem paridade imobiliária |
| Nova proposta | Fluxo de montagem imobiliária | tela `montar`, `boot` | Preservada | Pendente |
| Assistente | Questionário guiado de 5 etapas | `openQuiz` | Preservada | Pendente |
| Perfil financeiro | Renda familiar | questionário + proponentes | Preservada | Pendente |
| Perfil profissional | CLT, autônomo, servidor, empresário, aposentado | `openQuiz` | Preservada | Pendente |
| FGTS | Elegibilidade/uso de FGTS | questionário + regras | Preservada | Pendente |
| Sinal | Faixas de entrada/sinal | `openQuiz` | Preservada | Pendente |
| Unidades | Base de empreendimentos/unidades | `UNITS` | Preservada | Pendente |
| Disponibilidade | Uso apenas de unidades disponíveis | `renderReco` | Preservada | Pendente |
| Recomendação | Ranking de unidades compatíveis | `renderReco` | Preservada | Pendente |
| Unidade | Seleção/aplicação da recomendação | `applyReco`, `selectUnit` | Preservada | Pendente |
| Empreendimento | Dados de empreendimento, unidade, andar, tipologia e área | `UNITS` + seleção | Preservada | Pendente |
| Faixa de renda | `minRenda`/`maxRenda` por unidade | `UNITS`, `renderReco` | Preservada | Pendente |
| Tipo de venda | CEF, direto e à vista | `derivedTvenda`, `onTvenda` | Preservada | Pendente |
| Fluxo | Linhas de pagamento/parcelas | fluxo dinâmico | Preservada | Pendente |
| À vista | Conversão para ATO único | `onTvenda` | Preservada | Pendente |
| CEF | Regime e regras específicas | `toggleRegime` | Preservada | Pendente |
| Cálculo | Quantidade × valor e totalização | `calc` | Preservada | Pendente |
| Renda | Limites baseados em renda | `calc` | Preservada | Pendente |
| Financiamento | Valor financiado/sugerido/limites | `calc` | Preservada | Pendente |
| Vencimentos | Datas e limites de vencimento | `calc` | Preservada | Pendente |
| Validações | Bloqueios e alertas críticos | `calc`, chips de erro | Preservada | Pendente |
| Cadeia de venda | Seleção obrigatória antes de enviar/PDF | `chainOk`, `tryEnviar`, `exportPDF` | Preservada | Pendente |
| Comissão | SATI, credenciamento, prêmio, CCV e parceria | `calcCom`, `onParc` | Preservada | Pendente |
| Limite de comissão | Validação de percentual total | `calcCom`, `MAX_COM_TOTAL` | Preservada | Pendente |
| Datas de comissão | Validação dos pagamentos | `calcCom` | Preservada | Pendente |
| Rascunhos | Guardar proposta localmente | `guardarProposta` | Preservada | Pendente no servidor |
| Snapshot | Capturar todo o estado da proposta | `captureState` | Preservada | Pendente |
| Restauração | Reabrir rascunho completo | `restoreState` | Preservada | Pendente |
| Persistência | Chaves `pp_salvas` e `pp_enviadas` em localStorage | `saveSaved`, `saveSent`, `loadSaved`, `loadSent` | Preservada | Pendente no banco |
| Envio | Enviar proposta para fila | `tryEnviar`, `sendProposal` | Preservada | Pendente |
| Fila | Listagem/filtros da fila de aprovação | `renderFila` | Preservada | Pendente |
| Aprovação | Gerente → superintendente → diretor → VP | `doApprove` + cadeia | Preservada | RBAC existe, fluxo imobiliário pendente |
| Reprovação | Reprovar com atualização de estado | fluxo de reprovação | Preservada | Pendente |
| Detalhe | Visualização completa da proposta enviada | `openSent`, `detExtras` | Preservada | Parcial |
| PDF | Bloqueio quando cálculo é inválido | `pdfSafe` | Preservada | Pendente |
| PDF | Geração via jsPDF | `exportPDF` | Preservada | Pendente |
| PDF | Proponentes, unidade, fluxo, cadeia e assinaturas | `exportPDF` | Preservada | Pendente |
| PDF | Rodapé jurídico/CEF e naming do arquivo | `exportPDF` | Preservada | Pendente |
| Admin | Tela de regras de cálculo | `renderAdmin` | Preservada | Admin de usuários existe, regras financeiras pendentes |
| Admin | Sinal mínimo/máximo | regras editáveis | Preservada | Pendente |
| Admin | Percentual/limite de financiamento | regras editáveis | Preservada | Pendente |
| Admin | Subsídio máximo | regras editáveis | Preservada | Pendente |
| Admin | Prazo de vencimento | regras editáveis | Preservada | Pendente |
| Admin | Limite de propostas | regras editáveis | Preservada | Pendente |
| Admin | Percentual de FGTS | regras editáveis | Preservada | Pendente |
| Admin | Faixas e teto de CCV/comissão | regras editáveis | Preservada | Pendente |
| Admin | Alçadas/faixas de aprovação | regras editáveis | Preservada | Pendente |
| Resiliência | Dados e assets essenciais embutidos | monólito | Preservada | Pendente |
| Offline local | Rascunhos e enviados permanecem no navegador | localStorage | Preservada | Não migrada para sincronização offline/servidor |

## Questionário original

O assistente de proposta coleta, em sequência:

1. identificação/nome da família;
2. renda bruta familiar em faixas;
3. vínculo profissional;
4. disponibilidade/uso de FGTS;
5. valor disponível para sinal.

O resultado alimenta automaticamente proponentes/renda e a recomendação de unidades.

## Recomendação de unidades

A recomendação considera pelo menos:

- `status === 'DISPONÍVEL'`;
- faixa de renda mínima/máxima;
- sinal disponível;
- requisito de FGTS;
- preço de venda;
- ordenação e apresentação das melhores opções.

Cada recomendação exibe empreendimento, unidade, andar, tipologia, área, renda compatível, preço e sinal, e pode ser aplicada diretamente à proposta.

## Motor financeiro

O fluxo original não é um CRUD de itens. Ele é um motor de proposta imobiliária que trabalha com:

- ATO/entrada;
- parcelas e quantidades;
- datas de vencimento;
- valores intercalados/correção;
- financiamento CEF;
- valor total da proposta;
- relação entre renda, sinal e financiamento;
- tipo de venda derivado automaticamente;
- validações críticas que impedem envio/PDF quando necessário.

## Comissão

O cálculo original contempla componentes fixos/percentuais e parceria, verifica teto global e datas de pagamento e sincroniza o resultado com o estado da proposta. Uma futura implementação modular precisa reproduzir a mesma matemática e as mesmas validações antes de substituir `calcCom`.

## Persistência original

O protótipo usa `localStorage` (`pp_salvas` e `pp_enviadas`). Isso volta a funcionar em `/proposta`, mas ainda **não equivale a persistência multiusuário no banco**. A migração deverá criar armazenamento server-side sem remover a capacidade de guardar/reabrir a proposta completa.

## Aprovação

A proposta enviada percorre a cadeia de alçada do produto. O usuário da etapa atual pode agir e a fila/detalhe são atualizados. O RBAC novo pode substituir essa parte somente quando a regra de estágio, histórico, rejeição e autoridade estiver reproduzida no backend.

## PDF

A geração original só é permitida para proposta válida e com cadeia de venda definida. O documento inclui dados do cliente/proponentes, unidade, fluxo, validações, cadeia/assinaturas e observação jurídica relacionada à aprovação CEF.

## Critério para desligar `/proposta`

A rota compatível só poderá ser removida quando:

1. cada linha desta matriz estiver marcada como **Migrada com paridade**;
2. houver teste automatizado para regras financeiras e aprovação;
3. rascunhos e propostas persistirem no banco sem perder estado;
4. desktop e mobile estiverem funcionais;
5. PDF modular reproduzir os dados e bloqueios do original;
6. a migração tiver sido validada com os perfis de corretor, gerente, supervisor/superintendente, diretor, VP e admin.
