import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/hotel-layout";
import { RequireAuth } from "@/components/require-auth";
import { MemberExperiencesDashboard } from "@/components/experience-platform";
import { pageHead } from "@/lib/hotel-data";

export const Route = createFileRoute("/experiences/dashboard")({
  head: () =>
    pageHead(
      "My Experiences",
      "Track Gulsaga member experience submissions, moderation status and engagement.",
    ),
  component: ProtectedExperiencesDashboard,
});

function ProtectedExperiencesDashboard() {
  return (
    <RequireAuth role="member">
      <ExperiencesDashboardPage />
    </RequireAuth>
  );
}

function ExperiencesDashboardPage() {
  return (
    <Layout experienceMode>
      <MemberExperiencesDashboard />
    </Layout>
  );
}
