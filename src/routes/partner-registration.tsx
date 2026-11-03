import { createFileRoute } from "@tanstack/react-router";
import { InformationPage, informationPageHead } from "@/components/information-page";

export const Route = createFileRoute("/partner-registration")({
  head: () => informationPageHead("partner-registration"),
  component: () => <InformationPage kind="partner-registration" />,
});
