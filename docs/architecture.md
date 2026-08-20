# Arquitetura da recriação funcional do Proposta+

## Objetivo de produto

O Proposta+ será uma aplicação de gestão de propostas comerciais. A área autenticada suporta a equipa comercial desde o catálogo e a qualificação de um cliente até à criação, revisão, envio, aprovação e arquivo de uma proposta. A vista pública da proposta é separada da área de gestão e usa um token de acesso de leitura, permitindo uma apresentação limpa ao cliente sem expor o restante sistema.

Não serão incluídos dados de demonstração, clientes fictícios, avaliações ou propostas simuladas. Os estados vazios orientarão o primeiro registo real de cada entidade.

## Arquitetura de aplicação

| Camada | Responsabilidade | Decisão |
|---|---|---|
| Interface | Área de trabalho, formulários, tabelas, pré-visualização e ações de utilizador | React, Tailwind e componentes reutilizáveis, comunicando apenas através de tRPC |
| Autorização | Sessão, perfil e controlo de acesso | OAuth já fornecido pela plataforma; procedimentos protegidos e validações de proprietário/administrador no servidor |
| Lógica de negócio | Cálculos, transições de estado, auditoria, expiração e cadeia de aprovação | Procedimentos tRPC tipados e funções de domínio no servidor |
| Persistência | Dados relacionais consultáveis e auditáveis | Drizzle com base de dados MySQL/TiDB e migrações versionadas |
| Ficheiros | Logótipo, anexos e PDFs gerados | S3 através dos auxiliares de armazenamento do projeto; a base de dados guarda apenas metadados e chave do objeto |
| Documentos | Pré-visualização e PDF | Um modelo de proposta comum alimenta a vista React e o gerador PDF no servidor |
| Entrega por email | Aviso transacional quando a proposta é enviada | API Resend com chave de idempotência, anexo PDF e registo persistente de resultado |

> Os ficheiros não serão guardados em colunas binárias. Cada ficheiro terá uma chave S3, URL servida pela aplicação, nome original, tipo MIME, tamanho, autor e relação com a empresa ou proposta.

## Modelo de dados planeado

| Entidade | Campos nucleares | Relações e regras |
|---|---|---|
| `users` | OAuth, nome, email, papel global | A tabela base é estendida sem substituir o mecanismo de sessão. Os papéis globais são `admin` e `user`. |
| `company_settings` | Nome, NIF, morada, email, telefone, website, logo | Registo único gerido por administradores; a informação é incorporada em pré-visualizações e PDFs. |
| `clients` | Nome, empresa, NIF, email, telefone, cargo, morada, notas, estado de arquivo | Acesso por proprietário ou administrador; clientes arquivados não aparecem por defeito em novos documentos. |
| `catalog_items` | Tipo, nome, descrição, categoria, preço unitário, moeda, estado de arquivo | Suporta produtos e serviços; o preço é copiado para o item de proposta, preservando histórico. |
| `proposals` | Número, título, cliente, estado, moeda, taxa de imposto, desconto global, totais, validade, token público, proprietário, versão | O número e o token são únicos. O valor final é sempre recalculado no servidor a partir dos itens. |
| `proposal_items` | Produto/serviço opcional, descrição, quantidade, preço unitário, desconto, taxa de imposto, ordem | Valores monetários são persistidos em unidades mínimas para evitar erro de arredondamento. |
| `proposal_metadata` | Campos configuráveis de condições comerciais, entrada, financiamento, comissão, elegibilidade e notas | Mantém cobertura da proposta comercial especializada da referência sem acoplar o núcleo a um setor. |
| `proposal_attachments` | Nome, chave S3, tipo MIME, tamanho, associação ao PDF | Anexos carregados pelo proprietário ou administrador; podem ser incluídos no documento ou entrega. |
| `proposal_status_history` | Estado anterior, estado seguinte, comentário, data, utilizador | Registo de auditoria apenas acrescentável para cada transição. |
| `approval_steps` | Proposta, ordem, aprovador ou papel comercial, decisão, comentário, data | Configura uma cadeia de aprovação opcional; a proposta continua em `sent` até à decisão final. |
| `email_deliveries` | Proposta, versão, destinatário, fornecedor, idempotency key, identificador Resend, estado, erro, data | Uma restrição única por proposta e versão impede reenvios automáticos duplicados. |
| `stored_documents` | Proposta, tipo, chave S3, checksum, data, versão | Guarda o PDF emitido para download e auditoria de versão. |

## Estados e regras de negócio

O estado oficial da proposta respeita o fluxo solicitado: **Rascunho → Enviada → Aceite / Recusada / Expirada**. A alteração é executada unicamente no servidor, dentro de transação, e cria um evento no histórico.

| Estado de origem | Transição permitida | Efeito obrigatório |
|---|---|---|
| Rascunho | Enviada | Validar cliente, itens, configuração da empresa e destinatário; gerar PDF; criar registo de entrega; enviar email automaticamente. |
| Enviada | Aceite | Registar utilizador e data; concluir a cadeia de aprovação quando aplicável. |
| Enviada | Recusada | Exigir registo de motivo opcional e registar a decisão. |
| Enviada | Expirada | Aplicar quando a validade termina; a deteção pode ocorrer por consulta no servidor e será persistida na primeira interação relevante. |
| Aceite / Recusada / Expirada | Rascunho por duplicação | Preservar o original e criar uma nova proposta versionável; não reabrir silenciosamente o histórico. |

## Documento, ficheiros e visualização pública

A proposta pública será composta por uma capa Art Déco, identidade da empresa, identificação do cliente, tabela de itens, condições, totais, validade e anexos permitidos. A visualização e o PDF lerão o mesmo modelo de dados e as configurações atuais da empresa; o logótipo é resolvido a partir da chave de armazenamento S3. A emissão do PDF é feita no servidor e o PDF emitido é guardado no mesmo armazenamento de objetos para download e anexo de email.

O token público será opaco, suficientemente aleatório e independente do identificador sequencial da proposta. A rota pública revela apenas a proposta específica e não permite alterações, listagens ou acesso a anexos não assinalados para partilha.

## Email transacional

> A Resend permite anexos de até 40 MB após codificação Base64 e disponibiliza chaves de idempotência para reduzir duplicação de envios. [1]

>A opção escolhida é a API Resend, com `RESEND_API_KEY` e `RESEND_FROM_EMAIL` mantidos exclusivamente no ambiente de servidor. Ao mudar uma proposta para `sent`, a transação cria uma entrega pendente com uma chave derivada da proposta e da respetiva versão. O servidor gera o PDF, armazena-o, chama a Resend com a ligação pública e o PDF em anexo e atualiza a entrega com o identificador ou erro devolvido.

Uma falha de email não apaga a mudança de estado nem é ocultada: a proposta fica enviada, a entrega fica marcada como falhada e um administrador pode consultar o erro e efetuar um reenvio explícito e auditado. A validação da chave de envio Resend já passou sem enviar qualquer mensagem; a confirmação final do domínio de remetente será naturalmente validada pela primeira entrega real, porque a chave fornecida está intencionalmente limitada a envio e não a administração de domínios.

## Direção visual

O interface será uma área de trabalho escura, com o preto `#0B0B0A` como base, camadas em `#141411`, ouro metálico em `#D4AF37`, ouro claro em `#F2D889` e texto marfim em `#F8F3E7`. Os títulos usarão uma serifada editorial — `Cormorant Garamond` — e o texto de operação usará `Manrope`. A estrutura será desenhada com linhas duplas douradas, leques geométricos subtis, cantos angulares e espaços generosos; nunca dependerá de imagens de terceiros para funcionar.

Os componentes manterão contraste, foco visível, semântica de tabelas, mensagens de erro compreensíveis e adaptação para ecrãs estreitos. As animações limitar-se-ão a opacidade e transformação, com duração curta e respeito pela preferência de redução de movimento.

## Referências

[1]: https://resend.com/docs/api-reference/emails/send-email "Resend — Send Email API"
