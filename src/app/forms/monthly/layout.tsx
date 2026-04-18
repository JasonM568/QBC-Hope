import AdvancedModuleGuard from "@/components/advanced-module-guard";

export default function MonthlyLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdvancedModuleGuard moduleName="人生五域平衡月報告">
      {children}
    </AdvancedModuleGuard>
  );
}
