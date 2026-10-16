import { PixTransacao } from "../types/pixTransacoes";
import { DadoTemporalPix } from "../types/pixVisaoGeral";

export function montarDadosTemporaisPix(transacoes: PixTransacao[]) {
  const agrupado = transacoes.reduce<Record<string, DadoTemporalPix>>(
    (acc, transacao) => {
      const dataBase = transacao.dataPagamento || transacao.dataCriacao;
      const dataConvertida = new Date(dataBase);

      if (Number.isNaN(dataConvertida.getTime())) {
        return acc;
      }

      const chave = dataConvertida.toISOString().slice(0, 10);
      const data = dataConvertida.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });

      if (!acc[chave]) {
        acc[chave] = {
          data,
          dataOrdenacao: dataConvertida.getTime(),
          recebido: 0,
          pendente: 0,
          pagas: 0,
          canceladas: 0,
          naoIdentificadas: 0,
        };
      }

      if (["PAID", "AUTHORIZED"].includes(transacao.statusPagamento)) {
        acc[chave].recebido += transacao.valorPago;
        acc[chave].pagas += 1;
      }

      if (["WAITING", "IN_ANALYSIS"].includes(transacao.statusPagamento)) {
        acc[chave].pendente += transacao.valorBruto;
      }

      if (["CANCELED", "DECLINED"].includes(transacao.statusPagamento)) {
        acc[chave].canceladas += 1;
      }

      return acc;
    },
    {},
  );

  return Object.values(agrupado).sort(
    (a, b) => a.dataOrdenacao - b.dataOrdenacao,
  );
}

export function formatarValorEixoPix(valor: number) {
  if (valor >= 1000) {
    return `R$ ${Math.round(valor / 1000)} mil`;
  }

  return `R$ ${valor}`;
}
