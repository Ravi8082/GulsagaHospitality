import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Crown,
  Gem,
  Handshake,
  ImagePlus,
  MapPin,
  MessageSquare,
  Plus,
  Shield,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AUTH_EVENT } from "@/lib/auth-token";
import { apiRequest } from "@/lib/experience-api";
import { useHomeContent } from "@/lib/home-content";

type LiveCounts = Partial<Record<"resorts" | "destinations" | "network_partners", number>>;

export function DashboardOverview({
  resortCount,
  destinationCount,
  onNavigate,
}: {
  resortCount: number;
  destinationCount: number;
  onNavigate: (section: string) => void;
}) {
  const [live, setLive] = useState<LiveCounts | null>(null);
  const { adminDashboardContent, updateAdminDashboardContent, createPreviewMedia } =
    useHomeContent();

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const names = ["resorts", "destinations", "network_partners"] as const;
        const results = await Promise.all(
          names.map((name) => apiRequest<{ total: number }>(`admin/hospitality/${name}`)),
        );
        if (active) {
          setLive(Object.fromEntries(names.map((name, i) => [name, results[i]?.data.total ?? 0])));
        }
      } catch {
        if (active) setLive(null);
      }
    };
    void load();
    window.addEventListener(AUTH_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(AUTH_EVENT, load);
    };
  }, []);

  const source = live ? "Live database" : "Preview · sign in for live";
  const metrics = [
    { label: "Total users", value: "—", note: "Not connected", icon: Users },
    { label: "Active members", value: "—", note: "Not connected", icon: Crown },
    { label: "Total bookings", value: "—", note: "Not connected", icon: CalendarDays },
    {
      label: "Partner resorts",
      value: String(live?.resorts ?? resortCount),
      note: source,
      icon: Handshake,
    },
    {
      label: "Destinations",
      value: String(live?.destinations ?? destinationCount),
      note: source,
      icon: MapPin,
    },
    { label: "Avg. rating", value: "—", note: "No verified reviews", icon: Star },
  ];
  const quickActions = [
    { label: "Add Resort", icon: Building2, tab: "Resorts & Properties" },
    { label: "Add Destination", icon: MapPin, tab: "Destinations" },
    { label: "Create Offer", icon: Gem, tab: "Marketing & Offers" },
    { label: "Manage Bookings", icon: CalendarDays, tab: "Bookings" },
    { label: "Approve Experiences", icon: BadgeCheck, tab: "Experiences" },
    { label: "Send Notification", icon: Bell, tab: "Notifications" },
  ];
  const membership = ["Total memberships", "Active memberships", "Expiring (next 30 days)"];

  return (
    <div className="admin-dashboard">
      <section
        className="admin-welcome admin-welcome-banner"
        style={{ backgroundImage: `url(${adminDashboardContent.heroMedia.src})` }}
      >
        <div>
          <h1>Welcome, Admin</h1>
          <p>Here’s what’s happening at Gulsaga Hospitality today.</p>
        </div>
        <span className="admin-demo-notice">
          <Shield size={15} />{" "}
          {live ? "Connected to MySQL" : "Preview data · sign in for live content"}
        </span>
        <label className="admin-banner-upload">
          <ImagePlus size={14} /> Change banner image
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (!file) return;
              updateAdminDashboardContent({
                ...adminDashboardContent,
                heroMedia: createPreviewMedia(file),
              });
              event.currentTarget.value = "";
            }}
          />
        </label>
      </section>

      <section className="admin-metric-grid" aria-label="Business overview">
        {metrics.map((metric, index) => (
          <article
            className={`admin-metric-card${index % 2 === 1 ? " dark" : ""}`}
            key={metric.label}
          >
            <span className="admin-metric-icon">
              <metric.icon aria-hidden="true" />
            </span>
            <span className="admin-metric-label">{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.note}</small>
          </article>
        ))}
      </section>

      <div className="admin-board">
        <section className="admin-panel admin-board-bookings">
          <div className="admin-panel-heading">
            <h2>Bookings overview</h2>
            <span className="admin-not-connected">Not connected</span>
          </div>
          <div className="admin-chart-axes" aria-hidden="true">
            {[250, 200, 150, 100, 50, 0].map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
          <p className="admin-chart-caption">
            <ChartNoAxesCombined size={14} aria-hidden="true" /> Connect booking data to view
            verified trends.
          </p>
        </section>

        <section className="admin-panel admin-board-enquiry">
          <div className="admin-panel-heading">
            <h2>Enquiry status</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("Enquiries (CRM)")}>
              CRM <ArrowUpRight />
            </Button>
          </div>
          <div className="admin-donut" role="img" aria-label="No enquiry data connected">
            <strong>—</strong>
            <span>Total enquiries</span>
          </div>
          <ul className="admin-legend">
            {["New", "In progress", "Resolved", "On hold"].map((label) => (
              <li key={label}>
                <i />
                {label}
                <b>—</b>
              </li>
            ))}
          </ul>
        </section>

        <section className="admin-panel admin-board-pending">
          <div className="admin-panel-heading">
            <h2>Pending for approval</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("Experiences")}>
              Open <ArrowUpRight />
            </Button>
          </div>
          <div className="admin-approval-empty">
            <BadgeCheck aria-hidden="true" />
            <strong>No approval queue connected</strong>
            <span>Experience moderation lives in the Experiences panel.</span>
          </div>
        </section>

        <section className="admin-panel admin-board-actions">
          <div className="admin-panel-heading">
            <h2>Quick actions</h2>
          </div>
          <div className="admin-quick-actions">
            {quickActions.map((action) => (
              <button type="button" key={action.label} onClick={() => onNavigate(action.tab)}>
                <action.icon aria-hidden="true" />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="admin-panel admin-board-recent">
          <div className="admin-panel-heading">
            <h2>Recent bookings</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("Bookings")}>
              View all <ArrowUpRight />
            </Button>
          </div>
          <table className="admin-mini-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Member / guest</th>
                <th>Resort</th>
                <th>Stay dates</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5}>No bookings are connected yet.</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="admin-panel admin-board-membership">
          <div className="admin-panel-heading">
            <h2>Membership summary</h2>
          </div>
          <ul className="admin-summary-list">
            {membership.map((label) => (
              <li key={label}>
                {label}
                <b>—</b>
              </li>
            ))}
          </ul>
        </section>

        <section className="admin-panel admin-board-activity">
          <div className="admin-panel-heading">
            <h2>Recent activity</h2>
          </div>
          <div className="admin-inline-empty">
            <MessageSquare aria-hidden="true" />
            <span>Admin changes are recorded in the backend audit log.</span>
          </div>
        </section>
      </div>

      <p className="admin-security-note">
        <Shield size={15} /> Roles and permissions are enforced by the backend API, not by hiding
        dashboard sections.
      </p>
    </div>
  );
}
