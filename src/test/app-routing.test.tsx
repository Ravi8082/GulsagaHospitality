import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches the destinations collection and destination detail routes", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    expect(router.matchRoutes("/destinations").at(-1)?.routeId).toBe("/destinations/");
    expect(router.matchRoutes("/destinations/goa").at(-1)?.routeId).toBe(
      "/destinations/$destinationId",
    );
  });

  it("matches resort collection and detail routes", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    expect(router.matchRoutes("/resorts").at(-1)?.routeId).toBe("/resorts/");
    expect(router.matchRoutes("/resorts/juna-mahal").at(-1)?.routeId).toBe("/resorts/$resortId");
    expect(router.matchRoutes("/hotels").at(-1)?.routeId).toBe("/hotels");
    expect(router.matchRoutes("/membership").at(-1)?.routeId).toBe("/membership");
  });

  it("matches the contact page", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    expect(router.matchRoutes("/contact").at(-1)?.routeId).toBe("/contact");
  });

  it("matches the About Us page", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    expect(router.matchRoutes("/about").at(-1)?.routeId).toBe("/about");
  });

  it("matches support, policy, FAQ and partner registration pages", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    expect(router.matchRoutes("/faqs").at(-1)?.routeId).toBe("/faqs");
    expect(router.matchRoutes("/terms").at(-1)?.routeId).toBe("/terms");
    expect(router.matchRoutes("/privacy").at(-1)?.routeId).toBe("/privacy");
    expect(router.matchRoutes("/cancellation").at(-1)?.routeId).toBe("/cancellation");
    expect(router.matchRoutes("/support").at(-1)?.routeId).toBe("/support");
    expect(router.matchRoutes("/partner-registration").at(-1)?.routeId).toBe(
      "/partner-registration",
    );
  });
});
