import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import homeCss from "../home.css?url";
import adminCss from "../admin.css?url";
import destinationsCss from "../destinations.css?url";
import destinationDetailCss from "../destination-detail.css?url";
import resortsCss from "../resorts.css?url";
import membershipCss from "../membership.css?url";
import footerCss from "../footer.css?url";
import experienceCss from "../experiences.css?url";
import networkCss from "../network.css?url";
import contactCss from "../contact.css?url";
import aboutCss from "../about.css?url";
import informationCss from "../information.css?url";
import pageHeroCss from "../page-hero.css?url";
import adminDashboardCss from "../admin-dashboard.css?url";
import partnerCss from "../partner-dashboard.css?url";
import memberCss from "../member-dashboard.css?url";
import loginCss from "../login.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { HomeContentProvider } from "../lib/home-content";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Gulsaga Hospitality" },
      {
        name: "description",
        content: "Hotels, resorts and memorable holidays with Gulsaga Hospitality.",
      },
      { name: "author", content: "Gulsaga Hospitality" },
      { property: "og:title", content: "Gulsaga Hospitality" },
      {
        property: "og:description",
        content: "Hotels, resorts and memorable holidays with Gulsaga Hospitality.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "stylesheet",
        href: homeCss,
      },
      {
        rel: "stylesheet",
        href: adminCss,
      },
      {
        rel: "stylesheet",
        href: adminDashboardCss,
      },
      {
        rel: "stylesheet",
        href: partnerCss,
      },
      {
        rel: "stylesheet",
        href: memberCss,
      },
      {
        rel: "stylesheet",
        href: loginCss,
      },
      {
        rel: "stylesheet",
        href: destinationsCss,
      },
      {
        rel: "stylesheet",
        href: destinationDetailCss,
      },
      {
        rel: "stylesheet",
        href: resortsCss,
      },
      {
        rel: "stylesheet",
        href: membershipCss,
      },
      {
        rel: "stylesheet",
        href: footerCss,
      },
      {
        rel: "stylesheet",
        href: experienceCss,
      },
      {
        rel: "stylesheet",
        href: networkCss,
      },
      {
        rel: "stylesheet",
        href: contactCss,
      },
      {
        rel: "stylesheet",
        href: aboutCss,
      },
      {
        rel: "stylesheet",
        href: informationCss,
      },
      {
        rel: "stylesheet",
        href: pageHeroCss,
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Karla:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <HomeContentProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </HomeContentProvider>
    </QueryClientProvider>
  );
}
