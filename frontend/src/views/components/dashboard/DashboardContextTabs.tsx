// ============================================================================
// ARQUIVO: frontend/src/views/components/dashboard/DashboardContextTabs.tsx
// ============================================================================
import { Box, Tab, Tabs } from "@mui/material";

import { Contexto } from "@/views/pages/DashboardPage";
import { gerarSlug } from "@/shared/utils/formatadores";
import { DASHBOARD_HEADER_CONFIG } from "./dashboardHeaderConfig";
import { dashboardHeaderStyles } from "./dashboardHeaderStyles";

interface DashboardContextTabsProps {
  contextoAtual: Contexto;
  abaAtual: number;
  isMobile: boolean;
  onChangeAba: (novaAba: number) => void;
}

export function DashboardContextTabs({
  contextoAtual,
  abaAtual,
  isMobile,
  onChangeAba,
}: DashboardContextTabsProps) {
  const config = DASHBOARD_HEADER_CONFIG[contextoAtual];

  return (
    <Box sx={dashboardHeaderStyles.tabsWrapper}>
      <Tabs
        value={abaAtual}
        onChange={(_, novaAba) => onChangeAba(novaAba)}
        variant={isMobile ? "scrollable" : "fullWidth"}
        scrollButtons={isMobile ? "auto" : false}
        sx={dashboardHeaderStyles.tabs}
      >
        {config.tabs.map((tab, index) => (
          <Tab
            key={tab.label}
            label={tab.label}
            icon={tab.icon}
            iconPosition="start"
            data-testid={`dashboard-tab-${contextoAtual}-${gerarSlug(tab.label)}`}
            value={index}
          />
        ))}
      </Tabs>
    </Box>
  );
}
