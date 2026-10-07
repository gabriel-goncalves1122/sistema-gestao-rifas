# Coleção: `compradores`

## Propósito
A coleção `compradores` age como a Fonte da Verdade (Single Source of Truth) para os dados cadastrais e de contato das pessoas físicas que adquirem as rifas.

Esta separação é vital porque um comprador pode adquirir várias rifas diferentes em momentos diferentes, e caso ele mude de telefone, a edição ocorre primariamente neste documento e o sistema se encarrega de propagar para os bilhetes.

## Identificador
- **ID do Documento**: O ID alfanumérico gerado pelo Firestore, que também é salvo nos bilhetes sob a chave `comprador_id`.

## Dicionário de Dados

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | `string` | ID interno do documento. |
| `nome` | `string` | Nome completo do cliente. |
| `email` | `string` | E-mail de contato, usado para enviar recibos. |
| `telefone` | `string` | Telefone principal, geralmente WhatsApp. |
| `criado_em` | `string` | ISO timestamp do primeiro cadastro deste comprador. |

## Relacionamentos

- Este documento é apontado por múltiplos documentos em `bilhetes` e `pagamentos_pix`.

## Regras e Comportamentos
1. **Desnormalização**: Os dados aqui presentes (`nome`, `telefone`, `email`) são copiados e armazenados diretamente dentro dos documentos da coleção `bilhetes` e `pagamentos_pix`.
2. **Edição**: Toda edição cadastral deve alterar prioritariamente este documento, disparando o processo que varre e atualiza as cópias pendentes (geralmente geridas pela infraestrutura `correcao_pendente`).

## JSON de Exemplo (Anonimizado)

```json
{
  "id": "comp_1a2b3c",
  "nome": "Maria de Oliveira",
  "email": "maria.oliveira@email.com",
  "telefone": "+5535999999999",
  "criado_em": "2024-03-01T12:00:00Z"
}
```
