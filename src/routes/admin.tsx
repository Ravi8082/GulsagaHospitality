import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  LogOut,
  BadgeCheck,
  Eye,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  CircleHelp,
  Crown,
  FileImage,
  Gem,
  Handshake,
  House,
  Image,
  LayoutDashboard,
  Landmark,
  MapPin,
  MessageSquare,
  Megaphone,
  PanelBottom,
  PhoneCall,
  Plus,
  Search,
  Settings,
  Shield,
  Star,
  Tags,
  UserCog,
  Users,
} from "lucide-react";
import { Brand } from "@/components/hotel-layout";
import { HomePageEditor } from "@/components/home-page-editor";
import { DestinationAdminEditor } from "@/components/destination-admin-editor";
import { ResortAdminEditor } from "@/components/resort-admin-editor";
import { MembershipAdminEditor } from "@/components/membership-admin-editor";
import { FooterAdminEditor } from "@/components/footer-admin-editor";
import { LoginPageAdminEditor } from "@/components/login-page-admin-editor";
import { ContactAdminEditor } from "@/components/contact-admin-editor";
import { AboutAdminEditor } from "@/components/about-admin-editor";
import { ExperienceAdminPanel } from "@/components/experience-platform";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/experience-api";
import { LiveContentManager } from "@/components/live-content-manager";
import { DashboardOverview } from "@/components/dashboard-overview";
import { pageHead } from "@/lib/hotel-data";
import { useHomeContent } from "@/lib/home-content";
import { ChangeHistory } from "@/components/change-history";
import { PartnerAdmin } from "@/components/partner-admin";
import { PartnerItemsAdmin } from "@/components/partner-items-admin";
import { MembersAdmin, BookingsAdmin, EnquiriesAdmin, ReportsAdmin, PartnerActivityAdmin, ReviewsAdmin, MediaAdmin, NotificationsAdmin, SettingsAdmin, PoliciesAdmin } from "@/components/admin-ops";
import { AdminAlerts } from "@/components/admin-alerts";
import { MembershipApplicationsAdmin } from "@/components/membership-applications-admin";
import { MembershipCouponsAdmin } from "@/components/membership-coupons-admin";
import { AdminAccounts } from "@/components/admin-accounts";
import { RequireAuth } from "@/components/require-auth";
import { NetworkPageAdminEditor } from "@/components/network-page-admin-editor";
import { WhatsAppAdmin } from "@/components/whatsapp-admin";
import { VisibilityAdminEditor } from "@/components/visibility-admin-editor";

const adminGroups = [
  {
    title: "WORKSPACE",
    sections: [{ name: "Overview", icon: LayoutDashboard }],
  },
  {
    title: "MANAGEMENT",
    sections: [
      { name: "Users & Members", icon: Users },
      { name: "Resorts & Properties", icon: Building2 },
      { name: "Destinations", icon: MapPin },
      { name: "Experiences", icon: BadgeCheck },
      { name: "Bookings", icon: CalendarDays },
      { name: "Memberships", icon: Crown },
      { name: "Enquiries (CRM)", icon: MessageSquare },
      { name: "WhatsApp", icon: MessageSquare },
      { name: "Our Network", icon: Handshake },
      { name: "Website Links", icon: ArrowUpRight },
      { name: "Partners", icon: Handshake },
      { name: "Partner activity", icon: Bell },
    ],
  },
  {
    title: "CONTENT MANAGEMENT",
    sections: [
      { name: "Pages & Banners", icon: House },
      { name: "Blogs", icon: BookOpen },
      { name: "Media Library", icon: FileImage },
      { name: "Reviews & Ratings", icon: Star },
      { name: "Marketing & Offers", icon: Megaphone },
      { name: "Membership", icon: Gem },
      { name: "Home page", icon: House },
      { name: "About Us", icon: Landmark },
      { name: "Contact page", icon: PhoneCall },
      { name: "Footer", icon: PanelBottom },
      { name: "Login page", icon: PanelBottom },
      { name: "Page visibility", icon: Eye },
    ],
  },
  {
    title: "OPERATIONS",
    sections: [
      { name: "Reports & Analytics", icon: ChartNoAxesCombined },
      { name: "Team & Roles", icon: UserCog },
      { name: "Notifications", icon: Bell },
      { name: "Terms & Policies", icon: Settings },
      { name: "Change History", icon: Settings },
      { name: "Settings", icon: Settings },
    ],
  },
];

export const Route = createFileRoute("/admin")({
  head: () =>
    pageHead(
      "Admin dashboard preview",
      "Preview Gulsaga Hospitality website content and hotel management.",
    ),
  component: ProtectedAdmin,
});

function ProtectedAdmin() {
  return (
    <RequireAuth role="admin">
      <Admin />
    </RequireAuth>
  );
}

function Admin() {
  const [tab, setTab] = useState("Overview");
  const [search, setSearch] = useState("");
  const { resorts, destinations, contentLoaded, saveStatus } = useHomeContent();
  const navigate = (section: string) => {
    setTab(section);
    setSearch("");
  };

  return (
    <div className="admin-shell admin-shell-premium">
      <aside className="admin-sidebar">
        <Brand />
        <span className="admin-sidebar-role">
          <Crown size={15} /> Admin Panel
        </span>
        <nav className="admin-sidebar-nav" aria-label="Admin dashboard sections">
          {adminGroups.map((group) => (
            <section className="admin-sidebar-group" key={group.title}>
              <p>{group.title}</p>
              {group.sections.map((section) => (
                <Button
                  key={section.name}
                  variant={tab === section.name ? "default" : "ghost"}
                  onClick={() => navigate(section.name)}
                >
                  <section.icon />
                  {section.name}
                </Button>
              ))}
            </section>
          ))}
        </nav>
        <Button variant="outline" asChild className="back-site">
          <Link to="/">
            Visit website <ArrowUpRight />
          </Link>
        </Button>
        <Button
          variant="outline"
          className="back-site admin-signout"
          onClick={() => {
            void apiRequest("auth/admin/logout", { method: "POST" })
              .catch(() => undefined)
              .finally(() => window.location.replace("/login"));
          }}
        >
          <LogOut /> Sign out
        </Button>
      </aside>

      <main className="admin-content">
        <header className="admin-top">
          <span>GULSAGA / {tab.toUpperCase()}</span>
          <label className="admin-global-search">
            <Search size={16} />
            <input
              aria-label="Search management preview"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Search resorts, members..."
            />
          </label>
          <AdminAlerts onOpen={() => navigate("Bookings")} onActivity={() => navigate("Partner activity")} />
          <span
            className="preview-label"
            role="status"
            title={saveStatus.message}
            style={saveStatus.state === "error" ? { color: "#ff9a9a" } : undefined}
          >
            {saveStatus.state === "idle" ? "NO UNSAVED CHANGES" : saveStatus.message}
          </span>
        </header>

        {!contentLoaded && tab !== "Overview" ? (
          <p role="status">Loading saved content from the database…</p>
        ) : tab === "Overview" ? (
          <DashboardOverview
            resortCount={resorts.length}
            destinationCount={destinations.length}
            onNavigate={navigate}
          />
        ) : tab === "Home page" ? (
          <HomePageEditor />
        ) : tab === "Membership" ? (
          <MembershipAdminEditor />
        ) : tab === "Footer" ? (
          <FooterAdminEditor />
        ) : tab === "Page visibility" ? (
          <VisibilityAdminEditor />
        ) : tab === "Login page" ? (
          <LoginPageAdminEditor />
        ) : tab === "Contact page" ? (
          <>
            <LiveContentManager collectionId="contact_channels" />
            <ContactAdminEditor />
          </>
        ) : tab === "About Us" ? (
          <AboutAdminEditor />
        ) : tab === "Destinations" ? (
          <DestinationAdminEditor />
        ) : tab === "Resorts & Properties" || tab === "Hotels & rooms" ? (
          <>
            <LiveContentManager collectionId="resorts" />
            <ResortAdminEditor search={search} />
          </>
        ) : tab === "Experiences" ? (
          <>
            <LiveContentManager collectionId="experience_catalog" />
            <ExperienceAdminPanel />
          </>
        ) : tab === "Users & Members" ? (
          <MembersAdmin />
        ) : tab === "Memberships" ? (
          <>
            <MembershipApplicationsAdmin />
            <MembershipCouponsAdmin />
          </>
        ) : tab === "Bookings" ? (
          <BookingsAdmin />
        ) : tab === "Our Network" ? (
          <>
            <NetworkPageAdminEditor />
            <LiveContentManager collectionId="network_partners" />
          </>
        ) : tab === "WhatsApp" ? (
          <WhatsAppAdmin />
        ) : tab === "Partners" ? (
          <>
            <PartnerAdmin />
            <PartnerItemsAdmin />
          </>
        ) : tab === "Partner activity" ? (
          <PartnerActivityAdmin onNavigate={navigate} />
        ) : tab === "Change History" ? (
          <ChangeHistory />
        ) : tab === "Website Links" ? (
          <LiveContentManager collectionId="site_links" />
        ) : tab === "Enquiries (CRM)" ? (
          <EnquiriesAdmin />
        ) : tab === "Pages & Banners" ? (
          <AdminModuleEmpty
            title={tab}
            icon={House}
            detail="Use the page-specific editors to update the website preview."
          />
        ) : tab === "Media Library" ? (
          <MediaAdmin />
        ) : tab === "Reviews & Ratings" ? (
          <ReviewsAdmin />
        ) : tab === "Marketing & Offers" ? (
          <>
            <MembershipCouponsAdmin />
            <PartnerItemsAdmin />
          </>
        ) : tab === "Reports & Analytics" ? (
          <ReportsAdmin />
        ) : tab === "Team & Roles" ? (
          <AdminAccounts />
        ) : tab === "Settings" ? (
          <SettingsAdmin onNavigate={navigate} />
        ) : tab === "Terms & Policies" ? (
          <PoliciesAdmin />
        ) : tab === "Notifications" ? (
          <NotificationsAdmin onNavigate={navigate} />
        ) : (
          <>
            <div className="section-heading">
              <div>
                <p className="eyebrow">HOSPITALITY AT A GLANCE</p>
                <h1>{tab === "Overview" ? "Hotel dashboard" : tab}</h1>
              </div>
            </div>
            <p className="preview-note">
              Sample hotel data. Sign-in and management are available in the downloadable MySQL app.
            </p>
            <div className="admin-empty">
              <CalendarDays size={34} />
              <h2>No {tab.toLowerCase()} connected</h2>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function AdminModuleEmpty({
  title,
  icon: Icon,
  detail,
}: {
  title: string;
  icon: typeof Users;
  detail: string;
}) {
  return (
    <section className="admin-module-empty">
      <span>
        <Icon aria-hidden="true" />
      </span>
      <p className="admin-dashboard-kicker">BUSINESS OPERATIONS</p>
      <h1>{title}</h1>
      <p>{detail}</p>
      <span className="admin-not-connected">Preview only · backend integration required</span>
    </section>
  );
}
