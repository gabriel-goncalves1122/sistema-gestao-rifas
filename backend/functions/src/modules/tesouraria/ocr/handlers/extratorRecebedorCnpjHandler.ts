// ============================================================================
// ARQUIVO: backend/functions/src/modules/tesouraria/ocr/handlers/extratorRecebedorCnpjHandler.ts
// ============================================================================

import { ContextoAnaliseComprovante } from "../contracts/ocrContracts";
import { BaseAnalisadorHandler } from "./baseAnalisadorHandler";

/**
 * Elo responsável por localizar o nome e o CNPJ do recebedor/favorecido nas linhas
 * adjacentes aos rótulos bancários (`Para`, `Destino`, `Recebedor`, `Quem recebeu`).
 */
export class ExtratorRecebedorCnpjHandler extends BaseAnalisadorHandler {
  protected processar(contexto: ContextoAnaliseComprovante): void {
    const linhas = contexto.textoUpper
      .split(/\r?\n/)
      .map((l) => l.replace(/^[\|\[\]•·\-\s]+/, "").trim())
      .filter(Boolean);

    const rotulosRecebedor =
      /^(?:PARA|RECEBEDOR|FAVORECIDO|DESTINO|BENEFICIARIO|NOME DO RECEBEDOR|QUEM RECEBEU|DADOS DE QUEM RECEBEU)\b[:\s-]*(.*)$/;

    for (let i = 0; i < linhas.length; i++) {
      const match = linhas[i].match(rotulosRecebedor);
      if (!match) continue;

      const valorMesmaLinha = (match[1] || "").trim();
      if (
        !contexto.recebedorDetectado &&
        valorMesmaLinha.length >= 3 &&
        !/^(NOME|CPF|CNPJ|CHAVE|INSTITUICAO)$/.test(valorMesmaLinha)
      ) {
        contexto.recebedorDetectado = valorMesmaLinha;
      }

      for (let j = i + 1; j <= Math.min(i + 4, linhas.length - 1); j++) {
        const linhaSeguinte = linhas[j];
        if (!contexto.recebedorDetectado) {
          const semPrefixoNome = linhaSeguinte.replace(/^NOME[:\s-]*/, "").trim();
          if (
            semPrefixoNome.length >= 3 &&
            !/^(CPF|CNPJ|CPF\/CNPJ|CHAVE|BANCO|INSTITUICAO|AGENCIA|CONTA|TIPO DE CONTA)\b/.test(
              semPrefixoNome,
            ) &&
            !/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(semPrefixoNome)
          ) {
            contexto.recebedorDetectado = semPrefixoNome;
          }
        }

        if (!contexto.cnpjRecebedorDetectado) {
          const matchCnpj = linhaSeguinte.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/);
          if (matchCnpj) {
            const digitos = matchCnpj[1].replace(/\D/g, "");
            if (digitos.length === 14) {
              contexto.cnpjRecebedorDetectado = digitos;
            }
          }
        }
      }

      if (contexto.recebedorDetectado || contexto.cnpjRecebedorDetectado) {
        return;
      }
    }
  }
}
