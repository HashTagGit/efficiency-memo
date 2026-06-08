import React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@memo/ui";
import { getRegisteredTools } from "../../lib/tool-registry/registry";

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
  const tools = getRegisteredTools().filter((tool) => tool.enabled);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-500">Your personal tool gallery</p>
      </div>

      {tools.length === 0 ? (
        <div
          data-testid="dashboard-empty-state"
          className="flex flex-col items-center justify-center py-16 px-4 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
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
              className="text-gray-400"
            >
              <rect width="7" height="9" x="3" y="3" rx="1" />
              <rect width="7" height="5" x="14" y="3" rx="1" />
              <rect width="7" height="9" x="14" y="12" rx="1" />
              <rect width="7" height="5" x="3" y="16" rx="1" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            No tools available yet
          </h2>
          <p className="text-gray-500 max-w-sm">
            Tools will appear here once they are registered in the system.
          </p>
        </div>
      ) : (
        <div
          data-testid="dashboard-tool-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {tools.map((tool) => (
            <Card
              key={tool.id}
              title={tool.name}
              description={tool.description}
              icon={<ToolIcon name={tool.name} />}
              onClick={() => {
                const route = tool.routes[0];
                if (route) navigate(route);
              }}
              data-testid={`dashboard-tool-card-${tool.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
