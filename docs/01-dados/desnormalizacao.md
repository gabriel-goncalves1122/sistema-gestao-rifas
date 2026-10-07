# Desnormalização e Propagação de Dados

Devido às limitações de junção (Joins) nativas do NoSQL (Firestore), optamos por desnormalizar (copiar) dados imutáveis ou altamente lidos da entidade raiz (Ex: `Compradores`) para as entidades transacionais (Ex: `Bilhetes`), melhorando drasticamente o tempo de leitura e reduzindo o consumo de banda e cota do Firebase.

## O que é copiado e para onde vai?

### Da coleção `compradores`
A coleção `compradores` é a *Single Source of Truth* (SSOT) para informações de contato do cliente final.
Os seguintes campos são copiados para dentro de cada documento em `bilhetes` e em `pagamentos_pix`:
- `nome` → (vira `comprador_nome`)
- `telefone` → (vira `comprador_telefone`)
- `email` → (vira `comprador_email`)
- `documento` (Apenas no Pix) → (vira `comprador_documento`)

### Da coleção `usuarios` (vendedor)
A coleção `usuarios` é a SSOT do aderido logado que realizou a venda.
Os seguintes campos são copiados para dentro de `bilhetes` e `pagamentos_pix`:
- `id` → (vira `vendedor_id`)
- `nome` → (vira `vendedor_nome`)
- `cpf` → (vira `vendedor_cpf` apenas nos bilhetes)
- `email` → (vira `vendedor_email` apenas nos bilhetes)

### Do Objeto `PagamentosPix` (Webhook Sync)
A coleção de pagamentos é a SSOT transacional do Mercado Pago. Para que um `bilhete` individual saiba exatamente a qual transação ele pertence (para exibir o comprovante na UI sem fazer joins), os metadados do Pix descem (cascateiam) para dentro de cada documento de `bilhetes` envolvido na compra:
- `id` → (vira `pix_order_id`)
- `reference_id` → (vira `pix_reference_id`)
- `qr_code_id` (se houver) → (vira `pix_qr_code_id`)

## Quem é responsável pela propagação?

1. **Momento da Compra:**
   Ao realizar o checkout (ex: `criarCheckoutPixService.ts`), a Função Lambda busca o `Comprador` e o `Usuario` e injeta a cópia exata de seus dados dentro do `PagamentoPix` e de todos os `Bilhetes` englobados naquela transação.

2. **Momento da Atualização Cadastral:**
   Se a Maria de Oliveira atualizar seu número de celular:
   - A requisição do Frontend atualizará prioritariamente o documento fonte na coleção `compradores`.
   - O Backend possui um script associado a essa edição que varrerá todos os `bilhetes` e `pagamentos_pix` atrelados à `Maria` (`comprador_id`), atualizando em lote o campo `comprador_telefone`.
   
> [!CAUTION]
> **Nunca atualize `comprador_nome` ou `comprador_telefone` diretamente na coleção `bilhetes`.** Isso gerará dessincronia. Atualize sempre a coleção primária e deixe o serviço de backend propagar as alterações.
