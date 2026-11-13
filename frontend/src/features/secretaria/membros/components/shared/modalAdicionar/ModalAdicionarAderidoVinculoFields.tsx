import type { ChangeEvent, MouseEvent } from "react";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import {
  Box,
  Collapse,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";

import { SectionTitle } from "@/shared/components/SectionTitle";
import { components } from "@/shared/tokens/components";
import type {
  FormNovoAderido,
  ModalidadeAdesao,
} from "@/shared/types/secretaria";

type CargoMenuOption = { id: string; label: string };
type VinculoMembro = "aderido" | "comissao";
type VinculoFieldChangeEvent =
  | ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  | SelectChangeEvent<string>;

/**
 * Propriedades da seção de modalidade de adesão e vínculo institucional do novo membro.
 */
export interface ModalAdicionarAderidoVinculoFieldsProps {
  /** Dados atuais do formulário de cadastro. */
  form: FormNovoAderido;
  /** Bloqueia interações enquanto o envio ocorre. */
  isSubmitting: boolean;
  /** Vínculo atual selecionado ("aderido" ou "comissao"). */
  vinculoSelecionado: VinculoMembro;
  /** Indica se o bloco de cargo da comissão está expandido. */
  isComissao: boolean;
  /** Opções disponíveis de cargo da comissão. */
  cargosMenu: CargoMenuOption[];
  /** Atualiza a modalidade de adesão (`completo` ou `meio`). */
  onModalidadeChange: (
    event: MouseEvent<HTMLElement>,
    novaModalidade: ModalidadeAdesao | null,
  ) => void;
  /** Alterna o vínculo entre aderido e comissão. */
  onVinculoChange: (vinculo: VinculoMembro) => void;
  /** Handler genérico de alteração do select de cargo. */
  onChange: (event: VinculoFieldChangeEvent) => void;
}

/**
 * Renderiza os blocos de escolha de modalidade de adesão (120 ou 60 rifas)
 * e configuração de vínculo/cargo do membro na Secretaria.
 *
 * @param {ModalAdicionarAderidoVinculoFieldsProps} props - Estados de adesão, vínculo e callbacks.
 * @returns {JSX.Element} Seções de modalidade de rifas e vínculo.
 */
export function ModalAdicionarAderidoVinculoFields({
  form,
  isSubmitting,
  vinculoSelecionado,
  isComissao,
  cargosMenu,
  onModalidadeChange,
  onVinculoChange,
  onChange,
}: ModalAdicionarAderidoVinculoFieldsProps) {
  return (
    <>
      <Stack spacing={1.5}>
        <SectionTitle>Tipo de cadastro</SectionTitle>
        <ToggleButtonGroup
          exclusive
          fullWidth
          color="primary"
          value={form.modalidade_adesao}
          onChange={onModalidadeChange}
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
            color={form.modalidade_adesao === "completo" ? "primary" : "warning"}
            sx={{ fontSize: 24 }}
          />
          <Box>
            <Typography variant="subtitle2" fontWeight={800} color="text.primary">
              {form.modalidade_adesao === "completo"
                ? "Alocação: 120 Rifas Sequenciais"
                : "Alocação: 60 Rifas Sequenciais"}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {form.modalidade_adesao === "completo"
                ? "Meta financeira: R$ 1.200,00 • Geradas na autorização"
                : "Meta financeira: R$ 600,00 • Geradas na autorização"}
            </Typography>
          </Box>
        </Box>
      </Stack>

      <Divider />

      <Stack spacing={1.5}>
        <SectionTitle>Vínculo</SectionTitle>

        <FormControl
          fullWidth
          disabled={isSubmitting}
          size="small"
          sx={components.selectField}
        >
          <InputLabel id="vinculo-membro-label">Vínculo</InputLabel>
          <Select
            labelId="vinculo-membro-label"
            value={vinculoSelecionado}
            label="Vínculo"
            onChange={(event) =>
              onVinculoChange(event.target.value as VinculoMembro)
            }
          >
            <MenuItem value="aderido">Aderido</MenuItem>
            <MenuItem value="comissao">Comissão</MenuItem>
          </Select>
        </FormControl>

        <Collapse in={isComissao} data-testid="area-comissao">
          <FormControl
            fullWidth
            disabled={isSubmitting}
            size="small"
            sx={components.selectField}
          >
            <InputLabel id="cargo-comissao-label">Cargo na Comissão</InputLabel>
            <Select
              labelId="cargo-comissao-label"
              name="cargo"
              value={form.cargo}
              label="Cargo na Comissão"
              onChange={onChange}
            >
              {cargosMenu.map((cargo) => (
                <MenuItem key={cargo.id} value={cargo.id}>
                  {cargo.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Collapse>
      </Stack>
    </>
  );
}
