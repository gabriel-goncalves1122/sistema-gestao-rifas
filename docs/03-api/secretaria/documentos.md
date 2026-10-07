# API: Secretaria - Documentos Administrativos

Este submódulo é responsável pela gestão e catalogação de arquivos (atas, contratos, recibos) no Cloud Storage. Todas as rotas exigem nível de `admin` ou papel de coordenação.

> [!WARNING]  
> **Exceção de Padrão (CamelCase)**: Diferente do resto do sistema, os atributos de Documentos de Secretaria já são nativamente salvos em `camelCase` no banco de dados (ex: `nomeArquivo`, `mimeType`). Assim, o envio do payload abaixo bate 1-para-1 com o esquema físico.

## 1. Listar Documentos
**GET** `/api/admin/secretaria/documentos`

### Response (200 OK)
Retorna a lista completa para montar a tabela no painel admin.

```json
{
  "sucesso": true,
  "dados": [
    {
      "id": "doc_8f4x21",
      "titulo": "Ata de Reunião 01",
      "area": "Secretaria",
      "tipo": "ata",
      "nomeArquivo": "ata-01.pdf",
      "mimeType": "application/pdf",
      "tamanhoBytes": 456789,
      "urlVisualizacao": "https://storage.googleapis.com/...ata.pdf",
      "autorNome": "João da Silva",
      "criadoEm": "2024-03-12T10:00:00Z"
    }
  ]
}
```

---

## 2. Buscar Documento por ID
**GET** `/api/admin/secretaria/documentos/:id`

### Response (200 OK)
O mesmo DTO único acima.

---

## 3. Upload de Novo Documento (Multipart)
**POST** `/api/admin/secretaria/documentos`

Diferente do restante do sistema que aceita `application/json`, esta rota usa `multipart/form-data` interceptado por um middleware do Express (Busboy/Multer) para carregar o binário direto para o Storage.

### FormData (Request Body)
- `arquivo` (Buffer/File) - O arquivo físico.
- `titulo` (string)
- `area` (string) - `Presidência`, `Secretaria`, `Tesouraria`, etc.
- `tipo` (string) - `ata`, `contrato`, `planilha`, etc.
- `descricao` (string, opcional)
- `dataDocumento` (string ISO, opcional)

### Response (201 Created)
```json
{
  "sucesso": true,
  "documento": {
    "id": "doc_8f4x21",
    "titulo": "Ata de Reunião 01",
    // ... restante dos dados recém salvos
  }
}
```

---

## 4. Atualizar Metadados
**PUT** `/api/admin/secretaria/documentos/:id`

Muda os textos descritivos do documento sem substituir o binário físico do Storage. Espera Payload em JSON puro.

### Request Body
```ts
{
  titulo?: string;
  descricao?: string;
}
```

### Response (200 OK)
Devolve o objeto `Documento` modificado.
