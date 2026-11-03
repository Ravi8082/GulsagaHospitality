import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PartnerDashboard } from "@/components/partner-dashboard";

export const Route = createFileRoute("/partner")({
  head: () => ({
    meta: [
      { title: "Partner Portal | Gulsaga Hospitality" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProtectedPartner,
});

function ProtectedPartner() {
  return (
    <RequireAuth role="partner">
      <PartnerDashboard />
    </RequireAuth>
  );
}
