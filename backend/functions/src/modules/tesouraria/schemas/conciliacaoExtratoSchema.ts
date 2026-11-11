/**
 * Schemas de validação Yup para as rotas de conciliação por extrato bancário.
 *
 * @module conciliacaoExtratoSchema
 */
import * as yup from "yup";

export const analisarExtratoSchema = yup.object().shape({
  conteudoArquivo: yup
    .string()
    .trim()
    .min(10, "Arquivo de extrato vazio ou insuficiente.")
    .required("O conteúdo do arquivo de extrato é obrigatório."),
  nomeArquivo: yup.string().trim().optional(),
});

export const aprovarLoteConciliacaoSchema = yup.object().shape({
  itens: yup
    .array()
    .of(
      yup.object().shape({
        pagamentoId: yup.string().trim().required("ID do pagamento é obrigatório."),
        tipoMatch: yup
          .string()
          .oneOf(["TXID_EXATO", "E2E_EXATO", "NOME_VALOR_APROXIMADO"])
          .required("Tipo de match é obrigatório."),
        alvoMatch: yup
          .string()
          .oneOf(["TXID", "E2E", "COMPRADOR", "ADERIDO"])
          .required("Alvo do match é obrigatório."),
        valorBanco: yup
          .number()
          .positive("O valor deve ser positivo.")
          .required("Valor do banco é obrigatório."),
        txidBanco: yup.string().trim().optional(),
        endToEndIdBanco: yup.string().trim().optional(),
        nomePagadorBanco: yup.string().trim().optional(),
        dataBanco: yup.string().trim().optional(),
      }),
    )
    .min(1, "Selecione pelo menos um item para aprovação em lote.")
    .required("Lista de itens é obrigatória."),
});
