import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/destinations")({ component: DestinationsLayout });

function DestinationsLayout() {
  return <Outlet />;
}
