import { createFileRoute } from "@tanstack/react-router";
import { InformationPage, informationPageHead } from "@/components/information-page";

export const Route = createFileRoute("/faqs")({
  head: () => informationPageHead("faqs"),
  component: () => <InformationPage kind="faqs" />,
});
