# Coleção: `premios`

## Propósito
A coleção `premios` define a lista de prêmios que serão sorteados na rifa. Ela alimenta a página inicial exibida ao público e também serve de histórico após o sorteio, registrando o bilhete e o ganhador associado a cada premiação.

## Identificador
- **ID do Documento**: O ID alfanumérico do Firestore.

## Dicionário de Dados

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | `string` | ID interno do documento. |
| `colocacao` | `number` | A posição (1º, 2º, 3º prêmio) a qual este prêmio se refere. |
| `nome` | `string` | Título curto do prêmio (ex: "IPhone 15 Pro"). |
| `descricao` | `string` | Opcional: Detalhamento do prêmio. |
| `imagem_url` | `string` | Opcional: URL (geralmente apontando para o Storage) com a imagem do prêmio. |
| `ganhador_numero` | `string` | Opcional: O número do bilhete sorteado (preenchido após o encerramento). |
| `ganhador_nome` | `string` | Opcional: O nome da pessoa (comprador) que venceu (preenchido após o encerramento). |
| `ativo` | `boolean` | Flag de exibição, controlando se este prêmio está listado publicamente ou não. |

## Relacionamentos

- Apenas conceitual. Quando o prêmio é sorteado, `ganhador_numero` passa a atuar como uma referência ao ID (`numero`) da coleção `bilhetes`.

## JSON de Exemplo (Anonimizado)

```json
{
  "id": "prem_1a2b",
  "colocacao": 1,
  "nome": "IPhone 15 Pro",
  "descricao": "Aparelho lacrado, 256GB Titanium.",
  "ativo": true,
  "ganhador_numero": "00042",
  "ganhador_nome": "Maria de Oliveira"
}
```
