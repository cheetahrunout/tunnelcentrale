import { createFileRoute } from "@tanstack/react-router";
import { TunnelApp } from "@/components/tunnel/app-shell";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <TunnelApp />;
}
