import AdvancedModuleGuard from "@/components/advanced-module-guard";

export default function CapitalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdvancedModuleGuard moduleName="人生資本盤點表">
      {children}
    </AdvancedModuleGuard>
  );
}
