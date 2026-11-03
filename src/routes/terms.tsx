import { createFileRoute } from "@tanstack/react-router";
import { InformationPage, informationPageHead } from "@/components/information-page";

export const Route = createFileRoute("/terms")({
  head: () => informationPageHead("terms"),
  component: () => <InformationPage kind="terms" />,
});
