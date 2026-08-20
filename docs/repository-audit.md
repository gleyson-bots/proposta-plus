# Auditoria do repositório de referência

## Base analisada

A análise foi efetuada sobre o branch `main` do repositório `gleyson-bots/proposta-plus`, no commit `1a87446` (`Add files via upload`). A implementação de referência é uma aplicação estática concentrada em `index.html`, com CSS, HTML, JavaScript e uma cópia incorporada de jsPDF. Não existem serviços de backend, esquema de base de dados, autenticação OAuth real, rotas de API, armazenamento de ficheiros, mecanismo de email ou testes automatizados.

> A recriação não reutilizará o código estático da referência. Irá preservar os respetivos comportamentos de negócio úteis, substituindo a persistência local e os controlos de interface por contratos de servidor, base de dados e regras de autorização.

| Área na referência | Comportamento identificado | Cobertura na recriação funcional |
|---|---|---|
| Acesso e perfis | Simulação de login por emails fixos e cinco papéis comerciais | OAuth real; papéis globais `admin` e `user`; equipa e etapas de aprovação configuráveis por proposta |
| Catálogo comercial | Unidades/imóveis com tipologia, área, categoria, preço, disponibilidade e plano | Catálogo genérico de produtos/serviços extensível com atributos comerciais e categorias |
| Configurador | Seleção de unidade, dados do cliente, proposta de pagamento, composição e cálculo | Editor de propostas persistente com itens, desconto, impostos, totais e condições comerciais |
| Regras de negócio | Limites de categoria, elegibilidade, renda, entrada, financiamento e comissões | Regras comerciais configuráveis e validações de proposta no servidor; os campos específicos da referência ficam disponíveis como metadados de proposta quando necessários |
| Recomendações | Sugestões de unidades a partir de perfil e disponibilidade | Pesquisa, filtragem e sugestões por atributos do catálogo, sem dados fictícios pré-carregados |
| Rascunhos | Guardar e reabrir propostas no `localStorage` | Rascunhos persistentes por utilizador, com acesso controlado |
| Envio e fila | Envio simulado e progresso numa cadeia Corretor → Gerente → Superintendente → Diretor → VP | Estados formais da proposta, histórico imutável, auditoria por utilizador e cadeia de aprovação configurável por administradores |
| Aprovação | Aprovar, escalar ou recusar em memória local | Transições validadas no servidor, autorização por etapa e registo de auditoria |
| PDF | Exportação local no navegador com jsPDF | PDF gerado no servidor, com identidade da empresa, logótipo, anexos e dados atuais da proposta |
| Dados | Arrays fixos e duas chaves de `localStorage` (`propostamais_saved_v1`, `propostamais_sent_v1`) | Base de dados relacional, migrações versionadas e operações tRPC tipadas |

## Consequência arquitetural

A referência é demonstrativa e não pode ser promovida diretamente a produção. A nova aplicação será estruturada como um sistema full-stack com interface React, API tipada, OAuth, base de dados relacional e armazenamento de objetos. A exportação documental e o email serão responsabilidades de servidor; o browser apenas solicitará as ações autorizadas e apresentará os respetivos estados.

O desenho visual solicitado — Art Déco contemporâneo, preto profundo, dourado metálico, tipografia serifada e ornamentação geométrica — será aplicado à área autenticada e à pré-visualização documental, preservando contrastes, navegação por teclado e comportamento responsivo.
