import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/hotel-layout";
import { RequireAuth } from "@/components/require-auth";
import { ShareExperience } from "@/components/experience-platform";
import { pageHead } from "@/lib/hotel-data";

export const Route = createFileRoute("/experiences/share")({
  validateSearch: (search: Record<string, unknown>) => ({
    edit: typeof search.edit === "string" ? search.edit : undefined,
  }),
  head: () =>
    pageHead(
      "Share Your Experience",
      "Share a Gulsaga resort stay, holiday, art residency or celebration with the member community.",
    ),
  component: ShareExperiencePage,
});

function ShareExperiencePage() {
  const { edit } = Route.useSearch();
  return (
    <RequireAuth role="member">
      <Layout experienceMode>
        <ShareExperience experienceId={edit} />
      </Layout>
    </RequireAuth>
  );
}
