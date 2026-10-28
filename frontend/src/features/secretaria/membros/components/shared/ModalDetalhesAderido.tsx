import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";

import { formatarNomeMembro } from "../../utils/formatadoresSecretaria";
import type { AderidoSecretaria, FormEditarAderido as FormEditarAderidoData } from "@/shared/types/secretaria";
import { InformacoesAderidoCard } from "../detalhesAderido/InformacoesAderidoCard";
import { FormEditarAderido } from "../detalhesAderido/FormEditarAderido";

interface ModalDetalhesAderidoProps {
  open: boolean;
  aderido: AderidoSecretaria | null;
  onClose: () => void;
  onSalvar: (id: string, dados: FormEditarAderidoData) => Promise<void>;
}

function montarFormEdicao(aderido: AderidoSecretaria): FormEditarAderidoData {
  return {
    nome: formatarNomeMembro(aderido.nome),
    email: aderido.email || "",
    telefone: aderido.telefone || "",
    cpf: aderido.cpf || "",
    curso: aderido.curso || "",
    genero: aderido.genero || "",
    data_nascimento: aderido.data_nascimento || "",
    cargo: aderido.cargo || "aderido",
    status_cadastro: aderido.status_cadastro || "pendente",
  };
}

export function ModalDetalhesAderido({
  open,
  aderido,
  onClose,
  onSalvar,
}: ModalDetalhesAderidoProps) {
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<FormEditarAderidoData | null>(null);

  useEffect(() => {
    if (!aderido) return;
    setForm(montarFormEdicao(aderido));
    setEditando(false);
  }, [aderido]);

  if (!aderido || !form) return null;

  const nomeExibicao = formatarNomeMembro(aderido.nome) || "Nome não definido";

  const handleChange = (campo: keyof FormEditarAderidoData, valor: string) => {
    setForm((prev) => (prev ? { ...prev, [campo]: valor } : prev));
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await onSalvar(aderido.id, {
        ...form,
        nome: formatarNomeMembro(form.nome),
      });
      setEditando(false);
      onClose();
    } catch {
      // erro tratado pelo controller
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ p: 3, bgcolor: "grey.50", borderBottom: "1px solid", borderColor: "grey.200" }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ width: 52, height: 52, bgcolor: "primary.main", fontWeight: 700 }}>
            {aderido.nome?.charAt(0).toUpperCase() || "?"}
          </Avatar>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>
              Dados do Aderido
            </Typography>
            <Typography
              variant="h6"
              fontWeight={850}
              sx={{ lineHeight: 1.18, overflowWrap: "anywhere" }}
            >
              {nomeExibicao}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.4, overflowWrap: "anywhere" }}
            >
              {aderido.email || "E-mail não informado"}
            </Typography>

            {aderido.faixa_rifas?.inicio && aderido.faixa_rifas?.fim && (
              <Chip
                size="small"
                variant="outlined"
                icon={
                  <ConfirmationNumberIcon
                    sx={{ fontSize: "14px !important" }}
                  />
                }
                label={`Faixa: #${aderido.faixa_rifas.inicio}–${aderido.faixa_rifas.fim}`}
                sx={{
                  mt: 0.75,
                  height: 24,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  borderColor: "divider",
                  bgcolor: "background.paper",
                }}
              />
            )}
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {!editando ? (
          <InformacoesAderidoCard aderido={aderido} />
        ) : (
          <FormEditarAderido aderido={aderido} form={form} onChange={handleChange} />
        )}
      </DialogContent>

      <Divider />

      <DialogActions
        sx={{
          p: 2.5,
          pb: { xs: "max(16px, env(safe-area-inset-bottom))", sm: 2.5 },
        }}
      >
        {!editando ? (
          <>
            <Button onClick={onClose} color="inherit" disabled={salvando} startIcon={<CloseIcon />}>
              Fechar
            </Button>
            <Button variant="contained" onClick={() => setEditando(true)} startIcon={<EditIcon />}>
              Editar dados
            </Button>
          </>
        ) : (
          <>
            <Button color="inherit" onClick={() => { setForm(montarFormEdicao(aderido)); setEditando(false); }} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSalvar}
              disabled={salvando}
              startIcon={salvando ? <CircularProgress size={18} /> : <SaveIcon />}
            >
              {salvando ? "Salvando..." : "Salvar dados"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
