import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { MemberDashboard } from "@/components/member-dashboard";
import { pageHead } from "@/lib/hotel-data";

export const Route = createFileRoute("/dashboard")({
  head: () =>
    pageHead(
      "Member dashboard",
      "Your Gulsaga membership, bookings, experiences and member offers.",
    ),
  component: ProtectedDashboard,
});

function ProtectedDashboard() {
  return (
    <RequireAuth role="member">
      <MemberDashboard />
    </RequireAuth>
  );
}
