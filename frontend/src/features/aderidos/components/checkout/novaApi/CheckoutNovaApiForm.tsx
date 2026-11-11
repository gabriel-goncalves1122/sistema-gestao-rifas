// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/checkout/novaApi/CheckoutNovaApiForm.tsx
// ============================================================================
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import {
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";

import { CheckoutNovaApiFormData } from "./checkoutNovaApiSchema";
import { aplicarMascaraTelefone } from "../utils/checkoutUtils";

/**
 * Propriedades para renderização do formulário de comprador na Nova API.
 */
interface CheckoutNovaApiFormProps {
  /** Registrador do react-hook-form para captura de inputs */
  register: UseFormRegister<CheckoutNovaApiFormData>;
  /** Função de atualização imperativa de campos com máscara */
  setValue: UseFormSetValue<CheckoutNovaApiFormData>;
  /** Dicionário de erros de validação Yup */
  errors: FieldErrors<CheckoutNovaApiFormData>;
  /** Se `true`, desabilita os campos durante a geração do Pix ou cobrança ativa */
  isDisabled?: boolean;
}

/**
 * Formulário otimizado para a Nova API (Pix Direto / Chave Oficial).
 * Não exige CPF nem e-mail obrigatório, acelerando drasticamente o fechamento da venda.
 *
 * @param {CheckoutNovaApiFormProps} props - Propriedades do componente.
 */
export function CheckoutNovaApiForm({
  register,
  setValue,
  errors,
  isDisabled,
}: CheckoutNovaApiFormProps) {
  return (
    <Stack spacing={2}>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 700,
          color: "text.primary",
          fontSize: "0.88rem",
        }}
      >
        Dados do Comprador
      </Typography>

      <TextField
        label="Nome Completo do Comprador"
        fullWidth
        required
        disabled={isDisabled}
        inputProps={{ "data-testid": "checkout-nome" }}
        error={Boolean(errors.nome)}
        helperText={errors.nome?.message}
        placeholder="Ex: João da Silva"
        {...register("nome")}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <PersonOutlineIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
      />

      <TextField
        label="WhatsApp do Comprador"
        fullWidth
        required
        disabled={isDisabled}
        inputProps={{ "data-testid": "checkout-telefone" }}
        error={Boolean(errors.telefone)}
        helperText={errors.telefone?.message || "Usado para entrega do bilhete da rifa"}
        placeholder="(35) 99999-9999"
        {...register("telefone")}
        onChange={(event) => {
          const valorFormatado = aplicarMascaraTelefone(event.target.value);
          setValue("telefone", valorFormatado, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <PhoneOutlinedIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
      />

      <TextField
        label="E-mail (opcional)"
        fullWidth
        disabled={isDisabled}
        type="email"
        inputProps={{
          "data-testid": "checkout-email",
          autoCapitalize: "none",
        }}
        error={Boolean(errors.email)}
        helperText={
          errors.email?.message ||
          "Opcional. Preencha caso o comprador deseje receber o comprovante no e-mail."
        }
        placeholder="comprador@email.com"
        {...register("email")}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <EmailOutlinedIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
      />
    </Stack>
  );
}
