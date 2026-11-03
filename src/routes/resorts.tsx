import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/resorts")({ component: ResortsLayout });

function ResortsLayout() {
  return <Outlet />;
}
