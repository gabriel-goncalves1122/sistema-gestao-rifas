# OCR Sandbox (Isolado do Código Principal)

Ambiente isolado em Node.js + TypeScript para testar, medir performance (`ms` e `MB`) e validar a acurácia do novo motor de extração e correlação de comprovantes Pix **sem alterar** o frontend ou `backend/functions/src/`.

## Instalação

```bash
npm --prefix scripts/ocr-sandbox install
```

## Testes Unitários (Fixtures Sintéticas)

```bash
npm --prefix scripts/ocr-sandbox test
npm --prefix scripts/ocr-sandbox run typecheck
```

## Analisando um Comprovante Avulso

```bash
npm --prefix scripts/ocr-sandbox run analyze -- "./amostras/comprovante.pdf" --txid RIFAABC1234567 --valor 30.00 --recebedor "COMISSAO FORMATURA UNIFEI"
```

Passe `--bruto` para comparar o `Tesseract.js` sem o pré-processamento do `sharp`.

## Benchmark em Lote Local (`amostras/`)

1. Crie a pasta `scripts/ocr-sandbox/amostras/` (ignorada pelo `.gitignore`).
2. Coloque arquivos `.pdf`, `.png`, `.jpg` ou `.webp` dentro dela.
3. Opcionalmente, crie um arquivo com o mesmo nome terminando em `.caso.json` para validar a correlação:

```json
{
  "descricao": "Comprovante Nubank PDF real",
  "veredictoEsperado": "CORRELACAO_FORTE",
  "pedido": {
    "pagamentoId": "pag_123",
    "txidEsperado": "RIFA987654ABCD",
    "valorCentavos": 3000,
    "recebedorEsperado": "COMISSAO FORMATURA UNIFEI",
    "dataCriacaoIso": "2026-11-13T08:00:00",
    "e2eIdsJaUtilizados": []
  }
}
```

4. Execute o comparativo automático (`SHARP` vs `BRUTO`):

```bash
npm --prefix scripts/ocr-sandbox run benchmark
```

Os relatórios JSON são salvos localmente em `scripts/ocr-sandbox/relatorios/` (também ignorados pelo `.gitignore`).
