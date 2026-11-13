import { type ChangeEvent, type MouseEvent, useState } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";

import {
  CARGOS_COMISSAO,
} from "../../../../../shared/types/constants";
import type { FormNovoAderido, ModalidadeAdesao } from "../../../../../shared/types/secretaria";
import { colors } from "@/shared/tokens/colors";
import { components } from "@/shared/tokens/components";
import {
  formatarNomeMembro,
  sanitizarTelefoneColagem,
  somenteNumeros,
} from "../../utils/formatadoresSecretaria";
import { ModalAdicionarAderidoDadosFields } from "./modalAdicionar/ModalAdicionarAderidoDadosFields";
import { ModalAdicionarAderidoVinculoFields } from "./modalAdicionar/ModalAdicionarAderidoVinculoFields";

interface ModalAdicionarAderidoProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (dados: FormNovoAderido) => Promise<void>;
  isSubmitting?: boolean;
}

const formInicial: FormNovoAderido = {
  email: "",
  nome: "",
  curso: "",
  telefone: "",
  dataNascimento: "",
  cargo: "",
  modalidade_adesao: "completo",
};

type VinculoMembro = "aderido" | "comissao";
type CampoNovoAderido = keyof FormNovoAderido;
type ModalAdicionarChangeEvent =
  | ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  | SelectChangeEvent<string>;

export function ModalAdicionarAderido({
  open,
  onClose,
  onConfirm,
  isSubmitting: submittingExterno,
}: ModalAdicionarAderidoProps) {
  const [loading, setLoading] = useState(false);
  const [isComissao, setIsComissao] = useState(false);
  const [form, setForm] = useState<FormNovoAderido>(formInicial);

  const isSubmitting = submittingExterno ?? loading;
  const vinculoSelecionado: VinculoMembro = isComissao ? "comissao" : "aderido";

  const cargosMenu = CARGOS_COMISSAO.filter((cargo) => cargo.id !== "aderido");

  const handleChange = (e: ModalAdicionarChangeEvent) => {
    const name = e.target.name as CampoNovoAderido;
    const value = e.target.value;

    if (!name) return;

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTelefoneChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    setForm((prev) => ({
      ...prev,
      telefone: sanitizarTelefoneColagem(event.target.value),
    }));
  };

  const handleModalidadeChange = (
    _: MouseEvent<HTMLElement>,
    novaModalidade: ModalidadeAdesao | null,
  ) => {
    if (!novaModalidade) return;
    setForm((prev) => ({ ...prev, modalidade_adesao: novaModalidade }));
  };

  const handleVinculoChange = (valor: VinculoMembro) => {
    const membroComissao = valor === "comissao";
    setIsComissao(membroComissao);
    setForm((prev) => ({
      ...prev,
      cargo: membroComissao ? cargosMenu[0]?.id || "" : "",
    }));
  };

  const limparFormulario = () => {
    setForm(formInicial);
    setIsComissao(false);
  };

  const handleSalvar = async () => {
    if (!form.email) return;

    setLoading(true);
    try {
      await onConfirm({
        ...form,
        nome: formatarNomeMembro(form.nome),
        email: form.email.trim().toLocaleLowerCase("pt-BR"),
        telefone: sanitizarTelefoneColagem(form.telefone),
        data_nascimento: form.dataNascimento,
        dataNascimento: form.dataNascimento,
        cargo: isComissao ? form.cargo : "aderido",
      });
      limparFormulario();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ timeout: 300 }}
      PaperProps={{
        sx: {
          ...components.surface,
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          px: 3,
          py: 2.5,
          borderBottom: `1px solid ${colors.borda}`,
          color: "primary.dark",
          fontWeight: 900,
        }}
      >
        Adicionar membro
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: colors.branco }}>
        <Stack spacing={2.25}>
          <ModalAdicionarAderidoVinculoFields
            form={form}
            isSubmitting={isSubmitting}
            vinculoSelecionado={vinculoSelecionado}
            isComissao={isComissao}
            cargosMenu={cargosMenu}
            onModalidadeChange={handleModalidadeChange}
            onVinculoChange={handleVinculoChange}
            onChange={handleChange}
          />

          <Divider />

          <ModalAdicionarAderidoDadosFields
            form={form}
            isSubmitting={isSubmitting}
            onChange={handleChange}
            onTelefoneChange={handleTelefoneChange}
          />
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
          px: 3,
          pb: { xs: "max(16px, env(safe-area-inset-bottom))", sm: 2 },
          borderTop: `1px solid ${colors.borda}`,
        }}
      >
        <Button
          onClick={onClose}
          color="inherit"
          disabled={isSubmitting}
          sx={components.secondaryAction}
        >
          Cancelar
        </Button>

        <Button
          onClick={handleSalvar}
          variant="contained"
          disabled={isSubmitting || !form.email}
          startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <PersonAddAlt1Icon />}
          sx={components.primaryAction}
        >
          {isSubmitting ? "Adicionando..." : "Adicionar membro"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
