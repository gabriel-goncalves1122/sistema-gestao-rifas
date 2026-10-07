# Coleção: `documentos_secretaria`

## Propósito
A coleção `documentos_secretaria` armazena o histórico e metadados de arquivos administrativos (atas, planilhas, ofícios, etc.) operados pela diretoria e secretaria da comissão.
Os arquivos reais ficam hospedados no Cloud Storage, e este documento serve para catalogação e permissões de acesso.

## Identificador
- **ID do Documento**: O ID alfanumérico do Firestore gerado automaticamente.

## Dicionário de Dados

> [!WARNING]  
> **Exceção de Padrão (CamelCase no Banco):**  
> Historicamente, esta coleção foi modelada utilizando o padrão `camelCase` nas chaves do Firestore (ex: `nomeArquivo`, em vez de `nome_arquivo`), contrariando o padrão global `snake_case` do banco de dados.
> Este desvio arquitetural foi mantido para não quebrar a compatibilidade com a interface atual do módulo.

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | `string` | ID interno do documento. |
| `titulo` | `string` | Nome legível e descritivo do documento. |
| `area` | `string` | Setor da comissão (ex: `Presidência`, `Secretaria`, `Tesouraria`, `Marketing`). |
| `tipo` | `string` | Categoria do arquivo (ex: `ata`, `contrato`, `planilha`, `imagem`). |
| `nomeArquivo` | `string` | O nome físico do arquivo no storage (ex: `planilha-fechamento.xlsx`). |
| `mimeType` | `string` | O tipo do arquivo para o navegador (ex: `application/pdf`). |
| `tamanhoBytes` | `number` | Peso do arquivo para controle de quota. |
| `storagePath` | `string` | O caminho interno no bucket do Cloud Storage para o objeto. |
| `urlVisualizacao` | `string` | [Opcional] URL assinada ou pública para download/visualização direta. |
| `autorNome` | `string` | Nome do membro que fez o upload. |
| `criadoEm` | `string` | ISO timestamp do upload. |
| `atualizadoEm` | `string` | ISO timestamp da última modificação. |
| `dataDocumento` | `string` | [Opcional] Data referente ao assunto do documento (ex: data de uma ata). |
| `descricao` | `string` | [Opcional] Um resumo maior do conteúdo. |
| `periodoReferencia` | `string` | [Opcional] Referência temporal (ex: "Dezembro 2024"). |
| `textoAlternativo` | `string` | [Opcional] Alt text de acessibilidade (quando imagem). |
| `creditoImagem` | `string` | [Opcional] Nome do fotógrafo (quando imagem). |

## Relacionamentos

- Este documento aponta fisicamente para o arquivo real em Cloud Storage armazenado na rota `/documentos_secretaria/{area}/{tipo}/...`
- O `autorNome` é inserido diretamente a partir do Auth context da requisição, mas não guarda uma FK rígida com `usuarios`.

## JSON de Exemplo (Anonimizado)

```json
{
  "id": "doc_8f4x21",
  "titulo": "Ata de Reunião Fechamento de Vendas",
  "area": "Secretaria",
  "tipo": "ata",
  "nomeArquivo": "ata_01.pdf",
  "mimeType": "application/pdf",
  "tamanhoBytes": 456789,
  "storagePath": "documentos_secretaria/Secretaria/ata/doc_8f4x21_493a..._ata_01.pdf",
  "autorNome": "João da Silva",
  "criadoEm": "2024-03-12T10:00:00Z",
  "atualizadoEm": "2024-03-12T10:00:00Z",
  "dataDocumento": "2024-03-10T19:00:00Z"
}
```
