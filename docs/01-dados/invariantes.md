# Invariantes e Operações ACID (Firestore Transactions)

Devido à natureza concorrente do processo de vendas de rifas e do processamento de Webhooks Pix (que podem chegar simultaneamente para o mesmo bilhete), o projeto assume algumas leis invioláveis sobre como os dados transacionam no Firebase.

## 1. O que é um "Invariante"?
Um invariante é uma condição de negócio que **nunca pode ser violada** no estado do banco de dados, independentemente de atrasos de rede ou cliques duplos do usuário.

No Sistema de Rifas, temos os seguintes Invariantes:
- Um bilhete com status `pago` nunca pode ser vendido novamente.
- O e-mail de um membro aderido (`usuarios.email`) deve ser único em toda a base de dados.
- Um checkout finalizado no banco não pode ser processado duas vezes (Idempotência).
- O número gerado para um comprador ("próximo bilhete") deve ser puramente sequencial e único, sem pular casas ou repetir.

## 2. A Lei do `runTransaction`

Todas as operações acima que envolvem a mudança de status financeiro, alocação de bilhetes ou captura de webhooks ocorrem **obrigatoriamente** utilizando o método `runTransaction` do SDK Admin (Backend).

### Prevenção a TOCTOU (Time-of-Check to Time-of-Use)
O TOCTOU ocorre quando você lê um dado solto (ex: "bilhete está disponível? Sim"), processa por 1 segundo e depois escreve ("altera para pago"), e nesse intervalo de 1 segundo outra thread também vendeu o mesmo bilhete.

**Como prevenimos:**
As Functions do backend realizam a *leitura* do(s) documento(s) DENTRO do bloco da transação antes de escrever.
```typescript
// EXEMPLO DA LEI
await db.runTransaction(async (t) => {
  const docRef = db.collection('bilhetes').doc(rifaId);
  const docSnap = await t.get(docRef); // LEITURA DENTRO DO LOCK

  if (docSnap.data().status !== 'disponivel') {
    throw new Error('Bilhete já foi reservado por outra pessoa.');
  }

  t.update(docRef, { status: 'reservado' }); // ESCRITA GARANTIDA
});
```

## 3. Mecanismos Auxiliares de Concorrência

Como abordado no Dicionário de Dados, utilizamos coleções paralelas (Locks temporários) que dão suporte para estes invariantes operarem:
- **`pagamentos_pix_idempotencia`**: Protege a rota do Webhook. Se o MP disparar a aprovação duas vezes no mesmo segundo, o Firestore trava e descarta a segunda via esta coleção.
- **`indices_usuarios_email`**: Garante um pseudo-"Unique Constraint" (ausente no Firestore) no momento em que a secretaria cadastra dois usuários com mesmo e-mail, falhando na raiz transacional.
