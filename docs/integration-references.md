# Referências de integrações

## Resend — envio transacional de propostas

O envio automático usa o endpoint oficial de envio de emails da Resend. A implementação transmite remetente, destinatário, assunto, conteúdo HTML e o PDF da proposta em Base64. Cada transição de proposta para o estado `sent` usa uma chave de idempotência própria por proposta e versão, para impedir a duplicação de mensagens em reenvios ou tentativas repetidas.

> A documentação da Resend indica que anexos são enviados como uma lista de nome de ficheiro e conteúdo, com o limite de 40 MB por email após a codificação Base64, e que a chave de idempotência expira após 24 horas. [1]

## Referências

[1]: https://resend.com/docs/api-reference/emails/send-email "Resend — Send Email API"
