# Guia de operação do Proposta+

## Primeiro acesso e administração

O Proposta+ utiliza autenticação OAuth. O primeiro utilizador proprietário é promovido automaticamente a **admin**; os restantes utilizadores autenticados começam com o papel **user**. Os administradores gerem catálogo e identidade da empresa, enquanto os utilizadores só veem clientes e propostas de que são proprietários. As verificações de papel e propriedade são aplicadas no servidor, não apenas na interface.

Antes de enviar uma proposta, o administrador deve preencher **Empresa** com a denominação, NIF, contactos e morada. Estes dados são usados como fonte de verdade da pré-visualização pública, do PDF e do email. O logótipo pode ser carregado depois de guardar a ficha da empresa; a imagem é armazenada em S3 e a sua referência fica persistida.

## Fluxo comercial

O processo recomendado é criar o cliente, manter o catálogo de produtos e serviços e abrir uma proposta em rascunho. O editor calcula subtotais, descontos por linha, desconto global, imposto e total em cêntimos no servidor. Os campos de condições comerciais permitem preservar dados específicos do processo de venda, tais como financiamento, entrada, comissões ou elegibilidade.

| Estado | Significado operacional | Ações permitidas |
|---|---|---|
| **Rascunho** | Proposta em preparação. | Editar, apagar, anexar documentos, configurar e decidir a cadeia de aprovação; enviar depois de todas as etapas aprovadas. |
| **Enviada** | Proposta formal remetida ao cliente. | Gerar PDF, consultar ligação pública e marcar como aceite, recusada ou expirada. |
| **Aceite**, **Recusada**, **Expirada** | Decisão final. | Consultar, gerar PDF e duplicar para iniciar uma nova versão. |

Cada mudança de estado é escrita no histórico de auditoria com estado anterior, estado seguinte, data e utilizador. A cadeia comercial opcional permite configurar etiquetas de etapas — por exemplo, Gestão Comercial e Direção — ainda no rascunho. As decisões são tomadas obrigatoriamente pela ordem definida; uma recusa bloqueia as seguintes e uma cadeia configurada tem de estar integralmente aprovada antes do envio.

## Documentos, anexos e visualização

O botão **PDF** gera o documento no servidor, regista a versão em base de dados e guarda o ficheiro em S3. O PDF usa a identidade e os dados fiscais atuais da empresa, os dados do cliente, os itens, os totais, a mensagem e a lista de anexos partilhados. Os anexos não são incorporados dentro do ficheiro PDF; são mantidos em S3 e aparecem na visualização pública quando marcados para partilha.

O logótipo aceita imagens até **5 MB**. Os anexos de proposta aceitam ficheiros até **10 MB**. Os dados binários nunca são colocados na base de dados; apenas os respetivos metadados e referências de armazenamento são persistidos.

## Email automático via Resend

Quando uma proposta passa de **Rascunho** para **Enviada**, o servidor gera o PDF, cria a ligação segura `/p/<token>` e envia ao email do cliente através da Resend. A entrega usa uma chave de idempotência por proposta e versão, evitando a duplicação de mensagens em tentativas repetidas. O resultado fica registado em `email_deliveries`; se a Resend rejeitar a mensagem, a transição de estado mantém-se e o erro fica auditável para correção.

Para ativação num domínio próprio, mantenha as variáveis `RESEND_API_KEY` e `RESEND_FROM_EMAIL` configuradas e confirme o domínio/remetente na conta Resend antes de enviar a primeira proposta real. A Resend documenta o envio de anexos e o comportamento de idempotência no seu endpoint oficial. [1]

## Verificação antes de utilização comercial

O projeto compila para produção e a suite automatizada cobre sessão OAuth, permissões, cálculos, transições, credenciais Resend, idempotência, anexo PDF e falha de envio. O comando `pnpm test:persistence` cria uma base MySQL temporária, aplica a migração, valida relações e auditoria e elimina a base no fim; a base operacional não é usada por esse teste. Antes de operar comercialmente, execute um envio real para um contacto autorizado, usando uma proposta criada pela sua equipa, para confirmar a configuração DNS do domínio remetente na Resend e a entrega na caixa de correio pretendida.

## Referências

[1]: https://resend.com/docs/api-reference/emails/send-email "Resend — Send Email API"
