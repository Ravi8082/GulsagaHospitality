import { createFileRoute } from "@tanstack/react-router";
import { InformationPage, informationPageHead } from "@/components/information-page";

export const Route = createFileRoute("/privacy")({
  head: () => informationPageHead("privacy"),
  component: () => <InformationPage kind="privacy" />,
});
