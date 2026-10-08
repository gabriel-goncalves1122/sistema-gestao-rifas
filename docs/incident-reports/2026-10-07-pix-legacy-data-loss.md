# Incident Report: Perda Parcial de Dados em Bilhetes Legados (Pix)

**Data da Descoberta:** 07/10/2026
**Módulo Afetado:** Processamento de Vendas Pix e Histórico de Tesouraria.
**Severidade:** Média (Nenhum valor financeiro foi perdido, mas causou inconsistência na interface de tesouraria).

## 1. Descrição do Problema
Relatos indicaram que algumas rifas vendidas via Pix "sumiram" do histórico da tesouraria após serem aprovadas, e em outros casos, bilhetes não apareciam na aba "Validar Compras" para a aprovação.
Após varredura global (de 2.372 bilhetes), foram isolados 30 bilhetes com anomalias, divididos em dois cenários:

### Cenário A: Dados Fantasmas (28 bilhetes)
Os bilhetes tiveram o pagamento processado com sucesso (`status: "pago"`), porém perderam as chaves `comprador_nome`, `comprador_id` e `data_reserva` na coleção `bilhetes`.
- **Efeito:** Sem a `data_reserva`, o histórico os agrupava no final da lista (Ano 1970). Sem o nome, apareciam como "Desconhecido".
- **Causa Raiz:** O antigo código de reserva não executava as escritas de forma transacional (não usava `db.runTransaction`). Assim, uma falha na rede ou na execução assíncrona criava o bilhete parcialmente (sem dados do comprador) enquanto o pagamento (`pagamentos_pix`) era salvo corretamente.

### Cenário B: Limbo de Pagamento Atrasado (2 bilhetes)
Bilhetes trancados no status `pendente` e com o `motivo_recusa` preenchido ("Pagamento expirado por inatividade"), porém com o webhook Pix acusando `status_pagamento_banco: "approved"`.
- **Efeito:** A tesouraria enxergava o bilhete como pendente eternamente.
- **Causa Raiz:** Race condition. O usuário deixou o QR Code vencer (a cron job cancelou o bilhete). Muito tempo depois, o banco autorizou o pagamento atrasado. O webhook antigo recebia a notificação, atualizava o status do banco para "approved", mas não destrancava o bilhete do status `pendente`.

## 2. Solução Definitiva Adotada (Prevenção)
A arquitetura do fluxo Pix foi refatorada e revestida para garantir a consistência ACID:
- O hook de criação de pagamentos agora utiliza atritamente `db.runTransaction()`. Ou todos os documentos (bilhetes e pix) são escritos corretamente, ou a transação reverte tudo (Rollback).
- O webhook (`checkoutPixWebhookHelper`) ganhou proteção contra race conditions: caso receba um pagamento atrasado de um bilhete já liberado, o sistema o marca como `necessita_reembolso: true` em vez de corromper o bilhete.

## 3. Ações Corretivas (Data Healing)
Os dados corrompidos foram reparados via script (`migracao-dados-legados.js`).
O script recuperou as chaves `comprador_id`, `comprador_nome`, `comprador_telefone`, `comprador_email` e `data_criacao` (como `data_reserva`) da coleção intacta `pagamentos_pix` e as restaurou nos bilhetes danificados (Fantasmas), além de alterar o status de `pendente` para `pago` nos casos de limbo atrasado.
