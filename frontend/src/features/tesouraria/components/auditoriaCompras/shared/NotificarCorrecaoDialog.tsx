import { useState } from "react";
import ReplyOutlinedIcon from "@mui/icons-material/ReplyOutlined";
import {
  Button,
  Stack,
  TextField,
} from "@mui/material";

import { ResponsiveDialogShell } from "@/shared/components/ResponsiveDialogShell";
import { TransacaoTesouraria } from "../../../types/auditoriaCompras";
import { colors } from "@/shared/tokens/colors";
import { components } from "@/shared/tokens/components";
import { useTesourariaLayout } from "../../../hooks/useTesourariaLayout";

interface NotificarCorrecaoDialogProps {
  aberto: boolean;
  compra: TransacaoTesouraria | null;
  notificando: boolean;
  onClose: () => void;
  onSubmit: (mensagem: string) => void;
}

export function NotificarCorrecaoDialog({
  aberto,
  compra,
  notificando,
  onClose,
  onSubmit,
}: NotificarCorrecaoDialogProps) {
  const { isMobile } = useTesourariaLayout();
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mensagem.trim().length < 5) {
      setErro("A mensagem deve ter pelo menos 5 caracteres.");
      return;
    }
    onSubmit(mensagem);
  };

  const handleClose = () => {
    if (notificando) return;
    setMensagem("");
    setErro("");
    onClose();
  };

  if (!compra) return null;

  const conteudoCorrecao = (
    <Stack spacing={2.5} sx={{ p: isMobile ? 1 : 0 }}>
      <TextField
        label="O que precisa ser corrigido?"
        multiline
        rows={4}
        fullWidth
        value={mensagem}
        onChange={(e) => {
          setMensagem(e.target.value);
          if (erro) setErro("");
        }}
        error={Boolean(erro)}
        helperText={erro || "Esta mensagem aparecerá na tela do aderido."}
        disabled={notificando}
        InputProps={{
          sx: { borderRadius: 2, bgcolor: colors.fundoSuave },
        }}
      />
    </Stack>
  );

  const botoesAcoes = (
    <>
      <Button
        onClick={handleClose}
        disabled={notificando}
        fullWidth={isMobile}
        sx={{
          color: colors.cinzaTexto,
          fontWeight: 750,
          textTransform: "none",
        }}
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        disabled={notificando}
        startIcon={<ReplyOutlinedIcon />}
        fullWidth={isMobile}
        sx={{
          ...components.botaoPrimario,
          px: 3,
        }}
      >
        {notificando ? "Enviando..." : "Devolver para Aderido"}
      </Button>
    </>
  );

  return (
    <ResponsiveDialogShell
      open={aberto}
      onClose={handleClose}
      isMobile={isMobile}
      title="Solicitar Correção de Dados"
      subtitle={`Aderido: ${compra.vendedorNome}`}
      closeAriaLabel="Fechar solicitação de correção"
      closeDisabled={notificando}
      maxWidth="sm"
      onSubmit={handleSubmit}
      contentSx={{ p: 3, borderColor: colors.fundoEscuro }}
      actions={botoesAcoes}
    >
      {conteudoCorrecao}
    </ResponsiveDialogShell>
  );
}
