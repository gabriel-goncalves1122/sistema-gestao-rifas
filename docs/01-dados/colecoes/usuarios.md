# Coleção: `usuarios`

## Propósito
A coleção `usuarios` armazena os membros da comissão organizadora, também conhecidos como "aderidos". Eles são os responsáveis por realizar vendas e gerenciar o sistema conforme as permissões de seus cargos.

## Identificador
- **ID do Documento**: Normalmente gerado nativamente (ID alfanumérico aleatório do Firestore) ou pareado com o UUID do Firebase Authentication (`uid`).

## Dicionário de Dados

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | `string` | O ID interno do documento. |
| `id_aderido` | `string` | Identificação sequencial ou matrícula do aderido. |
| `uid` | `string` | UUID gerado pelo Firebase Authentication. Usado para login. |
| `nome` | `string` | Nome completo do membro. |
| `email` | `string` | E-mail de cadastro e login. |
| `telefone` | `string` | Telefone de contato. |
| `cpf` | `string` | Documento do aderido. |
| `curso` | `string` | Curso universitário associado. |
| `genero` | `string` | Gênero do membro. |
| `data_nascimento` | `string` | Data de nascimento. |
| `role` | `string` | [COMPATIBILIDADE] Papel do usuário no sistema (ex: `admin`, `tesouraria`). Muitas vezes sobreposto com `cargo`. |
| `cargo` | `string` | Cargo oficial do membro na comissão (ex: `presidencia`, `vendedor`, `rh`). |
| `modalidade_adesao` | `string` | Modalidade financeira do pacote (`completo`, `meio`). |
| `status` | `string` | Situação no sistema (`ativo`, `pendente`, `inativo`). |
| `posicao_adesao` | `number` | Posição ou rank de entrada. |
| `faixa_rifas` | `object` | Mapa contendo `inicio` e `fim`, delimitando os números de rifa alocados para este usuário vender. |
| `meta_vendas` | `number` | Meta de valor financeiro a ser arrecadado. |
| `total_arrecadado` | `number` | Soma agregada de todas as vendas validadas. |
| `rifas_vendidas` | `number` | Soma da quantidade de bilhetes validados e pagos. |
| `criado_em` | `string` | ISO timestamp da criação. |

## Relacionamentos

- Este usuário é referenciado por documentos em `bilhetes` (como `vendedor_id`) e `notificacoes` (como `usuario_id`).

## JSON de Exemplo (Anonimizado)

```json
{
  "id": "usr_9k3f8d",
  "uid": "abc123def456ghi789",
  "nome": "João da Silva",
  "email": "joao.silva@email.com",
  "telefone": "+5535988888888",
  "cpf": "123.456.789-00",
  "curso": "Engenharia Mecânica",
  "cargo": "vendedor",
  "status": "ativo",
  "modalidade_adesao": "completo",
  "meta_vendas": 5000,
  "total_arrecadado": 1500,
  "rifas_vendidas": 100,
  "criado_em": "2024-01-10T10:00:00Z"
}
```
