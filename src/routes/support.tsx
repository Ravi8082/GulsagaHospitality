import { createFileRoute } from "@tanstack/react-router";
import { InformationPage, informationPageHead } from "@/components/information-page";

export const Route = createFileRoute("/support")({
  head: () => informationPageHead("support"),
  component: () => <InformationPage kind="support" />,
});
