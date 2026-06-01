// Tool manifest type - describes a tool in the registry
export interface ToolManifest {
  id: string;
  name: string;
  icon: string;
  description: string;
  routes: string[];
  enabled: boolean;
}

// Tool registration - manifest + lazy component
export interface ToolRegistration {
  manifest: ToolManifest;
  component: () => Promise<{ default: React.ComponentType }>;
}

// User type alias for Supabase User
export type User = {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  created_at?: string;
  updated_at?: string;
};

// Dashboard tool - manifest + usage stats
export interface DashboardTool extends ToolManifest {
  lastUsed?: string;
  usageCount?: number;
}