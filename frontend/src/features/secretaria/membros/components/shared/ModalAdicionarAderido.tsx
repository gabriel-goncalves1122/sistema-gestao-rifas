import { type ChangeEvent, type MouseEvent, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";

import {
  CURSOS_UNIFEI,
  CARGOS_COMISSAO,
} from "../../../../../shared/types/constants";
import type { FormNovoAderido, ModalidadeAdesao } from "../../../../../shared/types/secretaria";
import { colors } from "@/shared/tokens/colors";
import { components } from "@/shared/tokens/components";
import {
  formatarNomeMembro,
  formatarTelefone,
  sanitizarTelefoneColagem,
  somenteNumeros,
} from "../../utils/formatadoresSecretaria";

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

function SectionTitle({ children }: { children: string }) {
  return (
    <Typography
      variant="subtitle2"
      color="primary.dark"
      fontWeight={900}
      sx={{ letterSpacing: "0.01em" }}
    >
      {children}
    </Typography>
  );
}

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
          <Stack spacing={1.5}>
            <SectionTitle>Tipo de cadastro</SectionTitle>
            <ToggleButtonGroup
              exclusive
              fullWidth
              color="primary"
              value={form.modalidade_adesao}
              onChange={handleModalidadeChange}
              disabled={isSubmitting}
              sx={{
                "& .MuiToggleButton-root": {
                  borderRadius: 2,
                  py: 1,
                  fontWeight: 800,
                },
              }}
            >
              <ToggleButton value="completo">Aderido completo</ToggleButton>
              <ToggleButton value="meio">Meio-aderido</ToggleButton>
            </ToggleButtonGroup>

            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor:
                  form.modalidade_adesao === "completo"
                    ? "rgba(46, 125, 50, 0.08)"
                    : "rgba(237, 108, 2, 0.08)",
                border: "1px solid",
                borderColor:
                  form.modalidade_adesao === "completo"
                    ? "rgba(46, 125, 50, 0.25)"
                    : "rgba(237, 108, 2, 0.25)",
                display: "flex",
                alignItems: "center",
                gap: 1.25,
              }}
            >
              <ConfirmationNumberIcon
                color={
                  form.modalidade_adesao === "completo" ? "primary" : "warning"
                }
                sx={{ fontSize: 24 }}
              />
              <Box>
                <Typography
                  variant="subtitle2"
                  fontWeight={800}
                  color="text.primary"
                >
                  {form.modalidade_adesao === "completo"
                    ? "Alocação: 120 Rifas Sequenciais"
                    : "Alocação: 60 Rifas Sequenciais"}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  {form.modalidade_adesao === "completo"
                    ? "Meta financeira: R$ 1.200,00 • Geradas na autorização"
                    : "Meta financeira: R$ 600,00 • Geradas na autorização"}
                </Typography>
              </Box>
            </Box>
          </Stack>

          <Divider />

          <Stack spacing={1.5}>
            <SectionTitle>Identificação</SectionTitle>
            <TextField
              name="email"
              label="E-mail da Keeper *"
              fullWidth
              required
              value={form.email}
              onChange={handleChange}
              placeholder="exemplo@unifei.br"
              disabled={isSubmitting}
              size="small"
              sx={components.formField}
            />

            <TextField
              name="nome"
              label="Nome completo"
              fullWidth
              value={form.nome}
              onChange={handleChange}
              disabled={isSubmitting}
              size="small"
              sx={components.formField}
            />
          </Stack>

          <Divider />

          <Stack spacing={1.5}>
            <SectionTitle>Dados opcionais</SectionTitle>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <FormControl fullWidth disabled={isSubmitting} size="small" sx={components.selectField}>
                <InputLabel id="curso-label">Curso</InputLabel>
                <Select
                  labelId="curso-label"
                  name="curso"
                  value={form.curso}
                  label="Curso"
                  onChange={handleChange}
                >
                  <MenuItem value="">Não informado</MenuItem>
                  {CURSOS_UNIFEI.map((curso) => (
                    <MenuItem key={curso} value={curso.toUpperCase()}>{curso}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                name="dataNascimento"
                label="Data de Nascimento"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.dataNascimento}
                onChange={handleChange}
                disabled={isSubmitting}
                size="small"
                sx={components.formField}
              />
            </Stack>

            <TextField
              name="telefone"
              label="Telefone"
              fullWidth
              placeholder="(35) 9..."
              value={formatarTelefone(form.telefone)}
              onChange={handleTelefoneChange}
              disabled={isSubmitting}
              size="small"
              sx={components.formField}
              inputProps={{
                inputMode: "numeric",
              }}
            />
          </Stack>

          <Divider />

          <Stack spacing={1.5}>
            <SectionTitle>Vínculo</SectionTitle>

            <FormControl fullWidth disabled={isSubmitting} size="small" sx={components.selectField}>
              <InputLabel id="vinculo-membro-label">Vínculo</InputLabel>
              <Select
                labelId="vinculo-membro-label"
                value={vinculoSelecionado}
                label="Vínculo"
                onChange={(event) => handleVinculoChange(event.target.value as VinculoMembro)}
              >
                <MenuItem value="aderido">Aderido</MenuItem>
                <MenuItem value="comissao">Comissão</MenuItem>
              </Select>
            </FormControl>

            <Collapse in={isComissao} data-testid="area-comissao">
              <FormControl fullWidth disabled={isSubmitting} size="small" sx={components.selectField}>
                <InputLabel id="cargo-comissao-label">Cargo na Comissão</InputLabel>
                <Select
                  labelId="cargo-comissao-label"
                  name="cargo"
                  value={form.cargo}
                  label="Cargo na Comissão"
                  onChange={handleChange}
                >
                  {cargosMenu.map((cargo) => (
                    <MenuItem key={cargo.id} value={cargo.id}>{cargo.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Collapse>
          </Stack>
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
