import AdvancedModuleGuard from "@/components/advanced-module-guard";

export default function StrategyLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdvancedModuleGuard moduleName="個人戰略定位工具">
      {children}
    </AdvancedModuleGuard>
  );
}
