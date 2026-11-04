import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { apiRequest } from "@/lib/experience-api";

type Alert = {
  id: number;
  guest: string;
  resort: string | null;
  status: string;
  amount: number | string | null;
  guests: number | null;
  createdAt: string;
  checkIn: string | null;
  checkOut: string | null;
};
type Feed = { latestId: number; fresh: number; items: Alert[] };
type Act = { key: string; type: string; at: string; resort: string; title: string };

const KEY = "gulsaga-admin-seen-booking";
const ACT_KEY = "gulsaga-admin-seen-activity";
const ago = (v: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(v).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export function AdminAlerts({
  onOpen,
  onActivity,
}: {
  onOpen: () => void;
  onActivity: () => void;
}) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [acts, setActs] = useState<Act[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Alert | null>(null);
  const [actToast, setActToast] = useState<Act | null>(null);
  const seen = useRef<number | null>(null);
  const announced = useRef(0);
  const actSeen = useRef<number | null>(null);
  const actAnnounced = useRef(0);

  const pollActivity = useCallback(async () => {
    try {
      if (actSeen.current === null) {
        const s = localStorage.getItem(ACT_KEY);
        actSeen.current = s === null ? -1 : Number(s);
      }
      const { data } = await apiRequest<{ rows: Act[] }>("admin/ops/activity?limit=15");
      const rows = data.rows.filter((r) => r.type !== "booking" && r.type !== "profile" && r.type !== "room");
      setActs(rows);
      const newest = rows[0] ? new Date(rows[0].at).getTime() : 0;
      if (actSeen.current < 0) {
        actSeen.current = newest;
        actAnnounced.current = newest;
        localStorage.setItem(ACT_KEY, String(newest));
        return;
      }
      if (rows[0] && newest > actAnnounced.current && newest > actSeen.current) {
        actAnnounced.current = newest;
        setActToast(rows[0]);
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Partner update", { body: `${rows[0].resort}: ${rows[0].title}` });
        }
      }
    } catch {
      /* not signed in or offline */
    }
  }, []);

  const poll = useCallback(async () => {
    try {
      if (seen.current === null) {
        const stored = localStorage.getItem(KEY);
        seen.current = stored === null ? -1 : Number(stored);
      }
      const base = seen.current < 0 ? 0 : seen.current;
      const { data } = await apiRequest<Feed>(`admin/ops/alerts?since=${base}`);
      if (seen.current < 0) {
        seen.current = data.latestId;
        localStorage.setItem(KEY, String(data.latestId));
        setFeed({ ...data, fresh: 0 });
        announced.current = data.latestId;
        return;
      }
      setFeed({ ...data, fresh: base === seen.current ? data.fresh : data.items.filter((a) => a.id > (seen.current ?? 0)).length });
      const newest = data.items[0];
      if (newest && newest.id > announced.current && newest.id > seen.current) {
        announced.current = newest.id;
        setToast(newest);
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("New booking on Gulsaga", {
            body: `${newest.guest} · ${newest.resort ?? "Partner property"}`,
          });
        }
      }
    } catch {
      /* not signed in or offline */
    }
  }, []);

  useEffect(() => {
    void poll();
    void pollActivity();
    const timer = setInterval(() => {
      void poll();
      void pollActivity();
    }, 20000);
    return () => clearInterval(timer);
  }, [poll, pollActivity]);

  const markSeen = () => {
    if (feed) {
      seen.current = feed.latestId;
      localStorage.setItem(KEY, String(feed.latestId));
      setFeed({ ...feed, fresh: 0 });
    }
    if (acts[0]) {
      const t = new Date(acts[0].at).getTime();
      actSeen.current = t;
      localStorage.setItem(ACT_KEY, String(t));
    }
    setToast(null);
    setActToast(null);
  };

  const toggle = () => {
    if (!open && "Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
    setOpen(!open);
  };

  const newActs = acts.filter((a) => actSeen.current !== null && new Date(a.at).getTime() > actSeen.current);
  const fresh = (feed?.fresh ?? 0) + newActs.length;
  return (
    <div className="aal">
      <button type="button" className="aal-bell" onClick={toggle} aria-label={`Booking alerts, ${fresh} new`}>
        <Bell size={18} />
        {fresh ? <b>{fresh > 9 ? "9+" : fresh}</b> : null}
      </button>
      {open ? (
        <div className="aal-menu">
          <div className="aal-menu-head">
            <strong>Latest bookings</strong>
            <button type="button" onClick={markSeen}>
              Mark all seen
            </button>
          </div>
          <ul>
            {acts.slice(0, 5).map((a) => (
              <li key={a.key} className={newActs.includes(a) ? "new" : ""}>
                <button
                  type="button"
                  onClick={() => {
                    markSeen();
                    setOpen(false);
                    onActivity();
                  }}
                >
                  <span>
                    <strong>{a.title}</strong>
                    <small>{a.resort}</small>
                  </span>
                  <em>{ago(a.at)}</em>
                </button>
              </li>
            ))}
            {feed?.items.map((a) => (
              <li key={a.id} className={seen.current !== null && a.id > seen.current ? "new" : ""}>
                <button
                  type="button"
                  onClick={() => {
                    markSeen();
                    setOpen(false);
                    onOpen();
                  }}
                >
                  <span>
                    <strong>
                      BK-{a.id} · {a.guest}
                    </strong>
                    <small>
                      {a.resort ?? "Partner property"} · {a.checkIn ?? "—"} → {a.checkOut ?? "—"}
                    </small>
                  </span>
                  <em>{ago(a.createdAt)}</em>
                </button>
              </li>
            ))}
            {!feed?.items.length ? <li className="aal-empty">No bookings yet.</li> : null}
          </ul>
        </div>
      ) : null}
      {actToast && !toast ? (
        <div className="aal-toast" role="status">
          <span>
            <strong>Partner update</strong>
            <small>
              {actToast.resort}: {actToast.title}
            </small>
          </span>
          <button
            type="button"
            onClick={() => {
              markSeen();
              onActivity();
            }}
          >
            View
          </button>
          <button type="button" aria-label="Dismiss" onClick={() => setActToast(null)}>
            ×
          </button>
        </div>
      ) : null}
      {toast ? (
        <div className="aal-toast" role="status">
          <span>
            <strong>New booking · BK-{toast.id}</strong>
            <small>
              {toast.guest} · {toast.resort ?? "Partner property"}
            </small>
          </span>
          <button
            type="button"
            onClick={() => {
              markSeen();
              onOpen();
            }}
          >
            View
          </button>
          <button type="button" aria-label="Dismiss" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
