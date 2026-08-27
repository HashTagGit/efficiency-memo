import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, EmptyState, PageHeader } from "@memo/ui";
import { getRegisteredTools } from "../../lib/tool-registry/registry";
import { useI18n } from "../../lib/i18n";
import { localizedToolCopy } from "../../lib/tool-registry/presentation";

function ToolIcon({ name }: { name: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    "Charger Reminder": (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="16" height="10" x="4" y="6" rx="2" />
        <line x1="8" x2="8" y1="6" y2="4" />
        <line x1="16" x2="16" y1="6" y2="4" />
        <line x1="12" x2="12" y1="14" y2="14" />
      </svg>
    ),
    "CoreHour": (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    "Pause & Hydrate": (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3.5S6.5 9.2 6.5 14a5.5 5.5 0 0 0 11 0C17.5 9.2 12 3.5 12 3.5Z" />
        <path d="M9.5 15.2a2.8 2.8 0 0 0 2.5 1.6" />
      </svg>
    ),
  };

  return iconMap[name] ?? (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const tools = getRegisteredTools().filter((tool) => tool.enabled);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.subtitle")} />

      {tools.length === 0 ? (
        <EmptyState
          data-testid="dashboard-empty-state"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="7" height="9" x="3" y="3" rx="1" />
              <rect width="7" height="5" x="14" y="3" rx="1" />
              <rect width="7" height="9" x="14" y="12" rx="1" />
              <rect width="7" height="5" x="3" y="16" rx="1" />
            </svg>
          }
          title={t("dashboard.noTools")}
          description={t("dashboard.noToolsDescription")}
        />
      ) : (
        <div
          data-testid="dashboard-tool-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {tools.map((tool) => {
            const copy = localizedToolCopy(tool, t);
            return (
              <Card
                key={tool.id}
                title={copy.name}
                description={copy.description}
                openLabel={t("dashboard.open")}
                icon={<ToolIcon name={tool.name} />}
                onClick={() => {
                  const route = tool.routes[0];
                  if (route) navigate(route);
                }}
                data-testid={`dashboard-tool-card-${tool.id}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
