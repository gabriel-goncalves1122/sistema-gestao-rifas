# Coleção: `configuracoes`

## Propósito
A coleção `configuracoes` armazena documentos "Singleton" que controlam variáveis de escopo global do sistema, como o documento que dita as configurações visuais e descritivas do sorteio (landing page) ou as flags de operação do sistema.

## Identificadores
Diferente das demais coleções cujos IDs são gerados aleatoriamente, os documentos de configuração têm **IDs fixos** (hardcoded), pois funcionam como registros únicos ("Singletons").
- **ID: `sorteio`**: Contém dados de exibição da página pública.
- **ID: `sistema`**: (Uso futuro) Pode conter flags como `vendas_abertas`.

## Dicionário de Dados — Documento: `sorteio` (InfoSorteio)

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `titulo` | `string` | Título grande exibido na landing page. |
| `data` | `string` | Data e hora agendada para o sorteio. |
| `descricao` | `string` | Texto explicativo ou sub-título de apoio. |

## JSON de Exemplo (Anonimizado)

```json
{
  "titulo": "Rifa de Computador Gamer",
  "data": "2024-12-15T20:00:00Z",
  "descricao": "Ajude a comissão participando e concorra a prêmios imperdíveis."
}
```
