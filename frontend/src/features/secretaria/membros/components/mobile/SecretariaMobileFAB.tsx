import Fab from "@mui/material/Fab";
import PersonAddIcon from "@mui/icons-material/PersonAdd";

interface SecretariaMobileFABProps {
  onClick: () => void;
}

export function SecretariaMobileFAB({ onClick }: SecretariaMobileFABProps) {
  return (
    <Fab
      color="primary"
      aria-label="Nova adesão"
      onClick={onClick}
      sx={{
        position: "fixed",
        bottom: "max(24px, calc(env(safe-area-inset-bottom) + 16px))",
        right: "max(20px, calc(env(safe-area-inset-right) + 16px))",
        zIndex: 1200,
      }}
    >
      <PersonAddIcon />
    </Fab>
  );
}
