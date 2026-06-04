import type { Metadata } from "next";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { getToolById } from "@/lib/tool-registry/registry";

interface ToolPageProps {
  params: Promise<{ toolId: string }>;
}

// Lazy-load the tool component
const getToolComponent = async (toolId: string) => {
  const tool = getToolById(toolId);

  if (!tool) {
    return null;
  }

  const Component = dynamic(() => tool.componentLoader(), {
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading tool...</div>
      </div>
    ),
  });

  return Component;
};

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { toolId } = await params;
  const tool = getToolById(toolId);

  if (!tool) {
    return {
      title: "Tool Not Found",
    };
  }

  return {
    title: tool.name,
    description: tool.description,
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { toolId } = await params;
  const tool = getToolById(toolId);

  if (!tool) {
    notFound();
  }

  const ToolComponent = await getToolComponent(toolId);

  if (!ToolComponent) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <ToolComponent />
    </div>
  );
}