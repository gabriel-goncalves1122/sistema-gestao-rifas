import { useMemo, useState } from "react";
import { Box } from "@mui/material";

import { BlocoVendasHeader } from "../BlocoVendasHeader";
import { FiltrosRifas } from "../FiltrosRifas";
import { GrelhaRifas } from "../GrelhaRifas";
import { painelAderidoStyles } from "../../styles/painelAderidoStyles";
import type { FiltroRifasAderido, RifaAderido } from "../../types/painelAderido";
import type { ContadoresRifas } from "../../utils/filtrosRifas";

interface PainelRifasPrincipalProps {
  filtro: FiltroRifasAderido;
  onChangeFiltro: (filtro: FiltroRifasAderido) => void;
  rifasFiltradas: RifaAderido[];
  contadoresRifas: ContadoresRifas;
  selecionadas: string[];
  onToggleSelecao: (numero: string, status: string) => void;
  onAbrirDetalhes: (rifa: RifaAderido) => void;
}

export function PainelRifasPrincipal({
  filtro,
  onChangeFiltro,
  rifasFiltradas,
  contadoresRifas,
  selecionadas,
  onToggleSelecao,
  onAbrirDetalhes,
}: PainelRifasPrincipalProps) {
  const [buscaNumero, setBuscaNumero] = useState("");

  const rifasVisiveis = useMemo(() => {
    const termo = buscaNumero.trim().toLowerCase();
    if (!termo) return rifasFiltradas;

    return rifasFiltradas.filter(
      (rifa) =>
        rifa.numero.toLowerCase().includes(termo) ||
        (rifa.comprador_nome || "").toLowerCase().includes(termo),
    );
  }, [rifasFiltradas, buscaNumero]);

  return (
    <Box sx={painelAderidoStyles.blocoVendasArea}>
      <BlocoVendasHeader totalRifasVisiveis={rifasVisiveis.length} />

      <FiltrosRifas
        filtro={filtro}
        contadores={contadoresRifas}
        onChangeFiltro={onChangeFiltro}
        buscaNumero={buscaNumero}
        onChangeBuscaNumero={setBuscaNumero}
      />

      <GrelhaRifas
        rifas={rifasVisiveis}
        selecionadas={selecionadas}
        onToggleSelecao={onToggleSelecao}
        onAbrirDetalhes={onAbrirDetalhes}
      />
    </Box>
  );
}
