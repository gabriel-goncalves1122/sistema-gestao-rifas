import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Drawer,
  Chip,
} from "@mui/material";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import BuildCircleOutlinedIcon from "@mui/icons-material/BuildCircleOutlined";

import { dashboardSidebarStyles } from "@/shared/styles/dashboardSidebarStyles";
import { Contexto } from "@/views/pages/DashboardPage";

/**
 * Interface de propriedades do componente Dumb `DashboardSidebar`.
 */
export interface DashboardSidebarProps {
  /** Se o drawer lateral de navegação está aberto. */
  open: boolean;
  /** Se o usuário atual é Super Administrador. */
  isSuperAdmin: boolean;
  /** Se o usuário possui permissão de acesso ao módulo da Tesouraria. */
  hasTesourariaAccess: boolean;
  /** Se o usuário possui permissão de acesso ao módulo da Secretaria. */
  hasSecretariaAccess: boolean;
  /** Identificador do contexto visual atualmente ativo ("aderido", "tesouraria", "secretaria"). */
  contextoAtual: Contexto;
  /** Se o modo de manutenção está ativo atualmente no sistema. */
  emManutencao?: boolean;
  /** Callback acionado para abrir o diálogo de controle de modo de manutenção. */
  onAbrirManutencao?: () => void;
  /** Callback acionado para fechar o Drawer lateral. */
  onClose: () => void;
  /** Callback disparado ao selecionar um novo módulo/contexto de navegação. */
  onMudarContexto: (contexto: Contexto) => void;
  /** Callback acionado ao clicar na opção de sair da conta (Logout). */
  onLogout: () => void;
}

/**
 * Componente Dumb de navegação lateral (Drawer) do painel principal da aplicação.
 * Renderiza o cabeçalho com badges de perfil/cargo e os itens de menu baseados nas permissões RBAC.
 *
 * @param {DashboardSidebarProps} props - Propriedades de navegação e callbacks de contexto.
 * @returns {JSX.Element}
 */
export function DashboardSidebar({
  open,
  isSuperAdmin,
  hasTesourariaAccess,
  hasSecretariaAccess,
  contextoAtual,
  emManutencao = false,
  onAbrirManutencao,
  onClose,
  onMudarContexto,
  onLogout,
}: DashboardSidebarProps) {
  const getCargoLabel = () => {
    if (isSuperAdmin) return "Administração Geral";
    if (hasTesourariaAccess) return "Tesouraria";
    if (hasSecretariaAccess) return "Secretaria";
    return "Aderido";
  };

  const itemAderidoSelecionado = contextoAtual === "aderido";
  const itemSecretariaSelecionado = contextoAtual === "secretaria";
  const itemTesourariaSelecionado = contextoAtual === "tesouraria";

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: {
          sx: dashboardSidebarStyles.backdrop,
        },
      }}
      PaperProps={{
        sx: dashboardSidebarStyles.drawerPaper,
      }}
    >
      <Box sx={dashboardSidebarStyles.root} role="presentation">
        <Box
          sx={dashboardSidebarStyles.header}
          data-testid="dashboard-sidebar-header"
        >
          <img
            src="/images/PNG (1080x1080).png"
            alt="Logo"
            style={{ width: "90px", height: "auto", marginBottom: "12px" }}
          />
          <Typography variant="h6" fontWeight="bold" textAlign="center">
            Portal da Comissão
          </Typography>
          <Typography
            variant="body2"
            sx={dashboardSidebarStyles.cargo}
          >
            <AccountCircleIcon fontSize="small" />
            {getCargoLabel()}
          </Typography>
        </Box>

        <List sx={dashboardSidebarStyles.list}>
          <ListItem disablePadding>
            <ListItemButton
              selected={itemAderidoSelecionado}
              data-testid="dashboard-contexto-aderido"
              sx={dashboardSidebarStyles.itemButton(itemAderidoSelecionado)}
              onClick={() => {
                onMudarContexto("aderido");
                onClose();
              }}
            >
              <ListItemIcon
                sx={dashboardSidebarStyles.itemIcon(itemAderidoSelecionado)}
              >
                <AccountCircleIcon />
              </ListItemIcon>
              <ListItemText
                primary="Área do Aderido"
                primaryTypographyProps={{
                  fontWeight: itemAderidoSelecionado ? 900 : 700,
                }}
              />
            </ListItemButton>
          </ListItem>

          {hasSecretariaAccess && (
            <ListItem disablePadding>
              <ListItemButton
                selected={itemSecretariaSelecionado}
                data-testid="dashboard-contexto-secretaria"
                sx={dashboardSidebarStyles.itemButton(
                  itemSecretariaSelecionado,
                )}
                onClick={() => {
                  onMudarContexto("secretaria");
                  onClose();
                }}
              >
                <ListItemIcon
                  sx={dashboardSidebarStyles.itemIcon(
                    itemSecretariaSelecionado,
                  )}
                >
                  <GroupAddIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Painel da Secretaria"
                  primaryTypographyProps={{
                    fontWeight: itemSecretariaSelecionado ? 900 : 700,
                  }}
                />
              </ListItemButton>
            </ListItem>
          )}

          {hasTesourariaAccess && (
            <ListItem disablePadding>
              <ListItemButton
                selected={itemTesourariaSelecionado}
                data-testid="dashboard-contexto-tesouraria"
                sx={dashboardSidebarStyles.itemButton(
                  itemTesourariaSelecionado,
                )}
                onClick={() => {
                  onMudarContexto("tesouraria");
                  onClose();
                }}
              >
                <ListItemIcon
                  sx={dashboardSidebarStyles.itemIcon(
                    itemTesourariaSelecionado,
                  )}
                >
                  <AdminPanelSettingsIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Painel da Tesouraria"
                  primaryTypographyProps={{
                    fontWeight: itemTesourariaSelecionado ? 900 : 700,
                  }}
                />
              </ListItemButton>
            </ListItem>
          )}

          {isSuperAdmin && onAbrirManutencao && (
            <ListItem disablePadding sx={{ mt: 1 }}>
              <ListItemButton
                onClick={() => {
                  onAbrirManutencao();
                  onClose();
                }}
                sx={{
                  borderRadius: 2,
                  backgroundColor: emManutencao
                    ? "rgba(237, 108, 2, 0.08)"
                    : "transparent",
                  "&:hover": {
                    backgroundColor: emManutencao
                      ? "rgba(237, 108, 2, 0.16)"
                      : "rgba(11, 47, 36, 0.04)",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: emManutencao ? "warning.main" : "#0B2F24",
                    minWidth: 40,
                  }}
                >
                  <BuildCircleOutlinedIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Modo Manutenção"
                  primaryTypographyProps={{
                    fontWeight: 700,
                    color: emManutencao ? "warning.dark" : "text.primary",
                  }}
                />
                {emManutencao && (
                  <Chip
                    size="small"
                    color="warning"
                    label="ATIVO"
                    sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          )}
        </List>

        <Divider sx={dashboardSidebarStyles.divider} />
        <List sx={{ px: 1 }}>
          <ListItem disablePadding>
            <ListItemButton onClick={onLogout}>
              <ListItemIcon>
                <LogoutIcon color="error" />
              </ListItemIcon>
              <ListItemText
                primary="Sair da Conta"
                sx={{ color: "error.main", fontWeight: "bold" }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
}
