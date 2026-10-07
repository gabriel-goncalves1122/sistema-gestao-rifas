# API: Tesouraria - Auditoria Legada (OCR)

Estas rotas foram mantidas por retrocompatibilidade e lidam com o processo de envio de imagens e extração de chaves via OCR bancário. É uma ferramenta de fallback caso a integração nativa Pix saia do ar.

## 1. Listar Logs e Documentos Pendentes
**GET** `/api/tesouraria/auditoria/pendentes`  
**Permissão:** Role `admin` ou `tesouraria`

Retorna um histórico das faturas pendentes de verificação de imagem pela tesouraria.

---

## 2. Salvar Extrato (Processar OCR Manual)
**POST** `/api/tesouraria/auditoria/extrato`  
**Permissão:** Role `admin` ou `tesouraria`

Salva os textos bancários colados pela tesouraria.

### Request Body
```ts
{
  extratoTexto: string; // Copia e cola do extrato do banco
}
```

---

## 3. Avaliar Documento Manualmente
**POST** `/api/tesouraria/auditoria/avaliar`  
**Permissão:** Role `admin` ou `tesouraria`

Cruza os dados textuais de um DOC/TED com um recibo no sistema para forçar aprovação (Avaliação Humana).

### Request Body
```ts
{
  transacaoId: string;
  status: "aceita" | "recusada";
}
```

---

## 4. Auditar em Lote via Inteligência Artificial
**POST** `/api/tesouraria/auditoria/auditar-lote`  
**Permissão:** Role `admin` ou `tesouraria`

Dispara um Job assíncrono que joga as URLs dos comprovantes pendentes na Vision API do Vertex AI/Google Cloud para varrer fraudes massivamente antes de aprovar.

### Request Body
*(vazio)*

### Response (200 OK)
Retorna o número de transações submetidas ao lote de IA.
