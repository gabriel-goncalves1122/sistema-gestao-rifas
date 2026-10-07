# Coleção: `notificacoes`

## Propósito
A coleção `notificacoes` armazena as mensagens direcionadas aos aderidos (vendedores) para orientá-los sobre ações necessárias. O principal caso de uso é alertá-los quando a tesouraria recusa um bilhete vendido por ele, marcando-o como `correcao_pendente` para que o vendedor acione o comprador.

## Identificador
- **ID do Documento**: O ID alfanumérico aleatório gerado pelo Firestore ao adicionar um novo documento.

## Dicionário de Dados

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | `string` | ID interno do documento. |
| `vendedor_id` | `string` | O ID do usuário (aderido) destinatário da mensagem. |
| `titulo` | `string` | Título curto do aviso. |
| `mensagem` | `string` | Corpo detalhado do aviso. |
| `rifas` | `string[]` | Array de IDs (números de bilhetes) que originaram este aviso (ex: `["00042", "00043"]`). |
| `tipo` | `string` | Categorização interna (ex: `correcao_dados`, `rifa_liberada`, `informativo`). |
| `lida` | `boolean` | Flag indicando se o usuário já marcou a notificação como lida no painel. |
| `data_criacao` | `string` | ISO timestamp do momento em que foi criada. |

## Relacionamentos

- **`vendedor_id`**: Chave estrangeira lógica referenciando a coleção `usuarios`.
- A listagem em `rifas` aponta logicamente para chaves da coleção `bilhetes`.

## JSON de Exemplo (Anonimizado)

```json
{
  "id": "notif_4m2x8p",
  "vendedor_id": "usr_9k3f8d",
  "titulo": "Correção Cadastral Exigida",
  "mensagem": "A tesouraria recusou as seguintes rifas pois o comprovante anexado é inválido. Por favor, acione o comprador e providencie a correção.",
  "rifas": ["00042", "00043"],
  "tipo": "correcao_dados",
  "lida": false,
  "data_criacao": "2024-03-11T09:00:00Z"
}
```
