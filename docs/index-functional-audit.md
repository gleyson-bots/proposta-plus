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

| Área | Capacidade no index original | Evidência principal | `/proposta` | Next modular |
| --- | --- | --- | --- | --- |
| Autenticação | Entrada no app por perfil | `enterApp`, `resolveRole`, `updateRoleUI` | Preservada | Parcial: sessão/RBAC existe |
| Perfis | Corretor, gerente, superintendente, diretor e VP | `ROLES`, `resolveRole` | Preservada | BROKER/MANAGER/SUPERVISOR/DIRECTOR/VP/ADMIN |
| Permissões | Visibilidade e ações por função | `setRole`, `updateRoleUI` | Preservada | Parcial |
| Desktop | Navegação própria do produto | `dgo` | Preservada | Não equivalente |
| Mobile | Fluxo/telas móveis próprias | `mgo`, `applyView` | Preservada | Não equivalente |
| Propostas | Lista das propostas guardadas | `renderPropostas` | Preservada | CRUD existe, sem paridade imobiliária |
| Nova proposta | Fluxo de montagem imobiliária | tela `montar`, `boot` | Preservada | Pendente |
| Assistente | Questionário guiado | `openQuiz` | Preservada | Pendente |
| Perfil financeiro | Renda familiar | questionário + proponentes | Preservada | Pendente |
| Perfil profissional | Vínculo profissional | `openQuiz` | Preservada | Pendente |
| FGTS | Informação de FGTS usada na recomendação | `openQuiz`, `renderReco` | Preservada | Pendente |
| Sinal | Faixas de valor disponível | `openQuiz` | Preservada | Pendente |
| Unidades | Base de empreendimentos/unidades | `UNITS` | Preservada | Pendente |
| Disponibilidade | Uso de unidades disponíveis | `renderReco` | Preservada | Pendente |
| Recomendação | Ranking de unidades compatíveis | `renderReco` | Preservada | Pendente |
| Unidade | Aplicar recomendação à proposta | `applyReco`, `selectUnit` | Preservada | Pendente |
| Empreendimento | Unidade, andar, tipologia, área e preço | `UNITS` + seleção | Preservada | Pendente |
| Faixa de renda | Compatibilidade de renda por unidade | `UNITS`, `renderReco` | Preservada | Pendente |
| Tipo de venda | CEF, direto e à vista | `derivedTvenda`, `onTvenda` | Preservada | Pendente |
| Fluxo | Linhas de pagamento/parcelas | `buildRow`, fluxo dinâmico | Preservada | Pendente |
| À vista | Conversão para ATO único | `onTvenda` | Preservada | Pendente |
| CEF | Exibição do regime correspondente | `toggleRegime` | Preservada | Pendente |
| Cálculo | Totalização e regras financeiras | `calc` | Preservada | Pendente |
| Sugestão de fluxo | Sugestão e aplicação de condições | `suggest`, `applyAdvise` | Preservada | Pendente |
| Vencimentos | Datas e regras do fluxo | `calc` | Preservada | Pendente |
| Validações | Alertas/chips do motor de cálculo | `calc` | Preservada | Pendente |
| Cadeia de venda | Cadeia obrigatória antes de enviar/PDF | `chainOk`, `tryEnviar`, `exportPDF` | Preservada | Pendente |
| Consultor | Busca/preenchimento da cadeia comercial | `searchConsult`, `pickConsult` | Preservada | Pendente |
| Comissão | Componentes e cálculo de comissão | `calcCom`, `onParc` | Preservada | Pendente |
| Rascunhos | Guardar proposta no navegador | `guardarProposta` | Preservada | Pendente no servidor |
| Snapshot | Capturar todo o estado da proposta | `captureState` | Preservada | Pendente |
| Restauração | Reabrir rascunho completo | `restoreState` | Preservada | Pendente |
| Persistência | `propostamais_saved_v1` e `propostamais_sent_v1` | `saveSaved`, `saveSent`, `loadSaved`, `loadSent` | Preservada | Pendente no banco |
| Envio | Enviar proposta para fila | `tryEnviar`, `sendProposal` | Preservada | Pendente |
| Fila | Listagem/filtros da fila | `renderFila` | Preservada | Pendente |
| Aprovação | Ação conforme etapa/alçada | `doApprove` | Preservada | RBAC existe; fluxo imobiliário pendente |
| Reprovação | Reprovar proposta | `doReprove` | Preservada | Pendente |
| Detalhe | Visualização da proposta enviada | `openSent`, `detExtras` | Preservada | Parcial |
| PDF | Valida unidade e cadeia antes de exportar | `exportPDF` | Preservada | Pendente |
| PDF | Geração via jsPDF | `exportPDF` | Preservada | Pendente |
| PDF | Proponentes, unidade, fluxo e dados comerciais | `exportPDF` | Preservada | Pendente |
| Admin | Tela “Regras de cálculo” | `id="d_admin"` | Preservada visualmente | Pendente |
| Admin | Comprometimento de renda CEF | inputs/tabela no `d_admin` | **Protótipo visual no original** | Pendente |
| Admin | Renda e entrada mínimas | inputs no `d_admin` | **Protótipo visual no original** | Pendente |
| Admin | Pós-chaves por tipologia | tabela no `d_admin` | **Protótipo visual no original** | Pendente |
| Admin | Tetos HIS-1/HIS-2/HMP/R2V | tabela no `d_admin` | **Protótipo visual no original** | Pendente |
| Admin | Descartar / Publicar v13 | botões sem handler no original | **Não funcional no original** | Pendente |
| Resiliência | Assets/dados principais embutidos | monólito | Preservada | Pendente |
| Offline local | Rascunhos/enviados no navegador | localStorage | Preservada | Sem sincronização offline/servidor |

## Descoberta importante: o Admin original não está implementado

A auditoria do código real mostrou que a seção **Regras de cálculo** existe no `index.html`, mas é um protótipo visual: os campos são inputs HTML e os botões **Descartar** e **Publicar v13** não possuem `onclick`, listener ou função de publicação associada.

Portanto, essa parte não deve ser registrada como “função preservada”. Na reconstrução ela precisa virar uma função real: regras versionadas, persistidas, publicáveis e consumidas pelo motor de cálculo.

Os valores apresentados pelo protótipo incluem:

- comprometimento de renda CEF de 15%/10% para renda de R$ 2.000 a R$ 4.500;
- comprometimento de 20%/10% acima de R$ 4.500;
- renda mínima de R$ 2.000;
- entrada mínima de R$ 500;
- pós-chaves de 20% em 48 meses para Studio/Studio 24/1D;
- 20% em 60 meses para 1D + Office;
- 25% em 60 meses para 2D e unidades especiais;
- regra textual de anuais/única até 150% para CLT com 24+ meses;
- tetos de classificação HIS-1, HIS-2, HMP e R2V.

## Questionário original

O assistente coleta informações de identificação, renda, vínculo profissional, FGTS e sinal. O resultado alimenta automaticamente proponentes/renda e a recomendação de unidades.

## Recomendação de unidades

A recomendação usa a biblioteca `UNITS`, disponibilidade, renda, sinal/condições e dados da unidade para apresentar opções compatíveis e permitir sua aplicação direta à proposta.

## Motor financeiro

O fluxo original não é um CRUD de produtos/serviços. É um motor imobiliário que trabalha com ATO/entrada, parcelas, vencimentos, condições, financiamento CEF, valor total, renda, tipo de venda derivado e validações.

Foi exatamente aqui que a primeira reconstrução perdeu paridade: a página modular de nova proposta passou a pedir descrição de item, quantidade e valor unitário, o que não representa o produto original.

## Comissão

O `index.html` contém cálculo de comissão (`calcCom`) e opção de parceria (`onParc`). A implementação modular só pode substituir esse trecho depois de reproduzir a matemática e os mesmos dados da proposta.

## Persistência original

O protótipo usa `localStorage` com as chaves reais:

- `propostamais_saved_v1` para rascunhos;
- `propostamais_sent_v1` para propostas enviadas.

Isso volta a funcionar em `/proposta`, mas ainda **não equivale a persistência multiusuário no banco**. A migração server-side deve conservar o snapshot completo e a capacidade de reabrir a proposta.

## Aprovação

A proposta enviada entra na fila e o código mantém ações/histórico por alçada. O RBAC novo só deve substituir essa parte quando fila, estágio, histórico, aprovação, reprovação e autoridade estiverem reproduzidos no backend.

## PDF

`exportPDF` verifica ao menos a existência da unidade e da cadeia de venda antes de gerar o documento. A geração usa jsPDF e inclui os dados montados da proposta. Não existe uma função chamada `pdfSafe` no index atual; a auditoria e os testes agora usam somente marcadores realmente presentes no código.

## Critério para desligar `/proposta`

A rota compatível só poderá ser removida quando:

1. cada capacidade funcional desta matriz estiver marcada como **Migrada com paridade**;
2. os elementos que eram apenas protótipos visuais no index — especialmente publicação de regras — estiverem realmente implementados;
3. houver testes automatizados para regras financeiras, comissão e aprovação;
4. rascunhos e propostas persistirem no banco sem perder estado;
5. desktop e mobile estiverem funcionais;
6. PDF modular reproduzir os dados e guardas necessários;
7. a migração tiver sido validada com corretor, gerente, supervisor/superintendente, diretor, VP e admin.
