import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/hotel-layout";
import { PublicExperiences } from "@/components/experience-platform";
import { pageHead } from "@/lib/hotel-data";

export const Route = createFileRoute("/experiences/")({
  head: () =>
    pageHead(
      "Member Experiences",
      "Discover real Gulsaga member stories, resort stays, art residencies and destination celebrations.",
    ),
  component: ExperiencesPage,
});

function ExperiencesPage() {
  return (
    <Layout experienceMode>
      <PublicExperiences />
    </Layout>
  );
}
