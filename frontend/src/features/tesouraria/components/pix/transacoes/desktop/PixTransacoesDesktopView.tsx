import { useMemo } from "react";
import { Box } from "@mui/material";

import {
  PixTransacoesFiltros as PixTransacoesFiltrosState,
  PixTransacao,
} from "../../../../types/pixTransacoes";
import {
  pixPagamentoConfirmadoBanco,
  podeValidarPixTransacao,
} from "../../../../utils/pixTransacoesUtils";
import { PixEmptyState } from "../shared/PixEmptyState";
import { PixTransacoesFiltros } from "../shared/PixTransacoesFiltros";
import { PixTransacoesTable } from "./PixTransacoesTable";

interface PixTransacoesDesktopViewProps {
  filtros: PixTransacoesFiltrosState;
  transacoes: PixTransacao[];
  todasTransacoes?: PixTransacao[];
  onChangeFiltros: (filtros: PixTransacoesFiltrosState) => void;
  onAceitar: (id: string) => Promise<void>;
  onNegar: (id: string, motivo: string) => Promise<void>;
}

export function PixTransacoesDesktopView({
  filtros,
  transacoes,
  todasTransacoes,
  onChangeFiltros,
  onAceitar,
  onNegar,
}: PixTransacoesDesktopViewProps) {
  const fonte = todasTransacoes || transacoes;

  const contagens = useMemo(() => {
    return {
      novas: fonte.filter(podeValidarPixTransacao).length,
      aprovadas: fonte.filter((t) => t.statusValidacao === "aceita").length,
      recusadas: fonte.filter((t) => t.statusValidacao === "negada").length,
      aguardando_pagamento: fonte.filter(
        (t) => !pixPagamentoConfirmadoBanco(t),
      ).length,
      todas: fonte.length,
    };
  }, [fonte]);

  return (
    <Box>
      <PixTransacoesFiltros
        filtros={filtros}
        onChangeFiltros={onChangeFiltros}
        totalResultados={transacoes.length}
        contagens={contagens}
      />

      {transacoes.length === 0 ? (
        <PixEmptyState />
      ) : (
        <PixTransacoesTable
          transacoes={transacoes}
          onAceitar={onAceitar}
          onNegar={onNegar}
        />
      )}
    </Box>
  );
}
