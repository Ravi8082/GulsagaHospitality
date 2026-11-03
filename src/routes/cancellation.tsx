import { createFileRoute } from "@tanstack/react-router";
import { InformationPage, informationPageHead } from "@/components/information-page";

export const Route = createFileRoute("/cancellation")({
  head: () => informationPageHead("cancellation"),
  component: () => <InformationPage kind="cancellation" />,
});
