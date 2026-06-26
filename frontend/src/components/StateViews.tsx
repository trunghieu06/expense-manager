import { Loader2, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function LoadingBlock({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-6 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">{label ?? t("loading")}</span>
    </div>
  );
}

export function ErrorBlock({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-foreground">{t("error")}</div>
          <div className="mt-1 text-sm text-muted-foreground break-words">{msg}</div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 rounded-full bg-foreground px-4 py-1.5 text-xs text-background hover:opacity-90"
            >
              {t("retry")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
