// Admin tab for the OpenWA WhatsApp integration. All data comes from the Node backend
// (backend/src/whatsapp.js, routes under /api/admin/whatsapp); nothing is stored in the browser.
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/experience-api";

type Status = {
  configured: boolean;
  autoReply: boolean;
  session: { status: string; phone?: string; error?: string } | null;
  optedInContacts: number;
};
type Contact = { phone: string; name: string | null; opted_in: number | boolean };
type PartnerNumber = { id: number; resort_id: number; phone: string; resortName: string | null };
type WaBooking = {
  id: number;
  resortName: string | null;
  roomName: string | null;
  guestName: string;
  phone: string;
  guests: number;
  checkIn: string;
  checkOut: string;
  status: string;
};
type Message = {
  id: number;
  phone: string;
  direction: string;
  kind: string;
  body: string | null;
  status: string;
  created_at: string;
};

export function WhatsAppAdmin() {
  const [status, setStatus] = useState<Status | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [numbers, setNumbers] = useState("");
  const [text, setText] = useState("");
  const [onlyListed, setOnlyListed] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [partners, setPartners] = useState<PartnerNumber[]>([]);
  const [resorts, setResorts] = useState<{ id: number; name: string }[]>([]);
  const [partnerResort, setPartnerResort] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [bookings, setBookings] = useState<WaBooking[]>([]);

  const load = useCallback(async () => {
    try {
      const [s, c, m, p, bk] = await Promise.all([
        apiRequest<Status>("admin/whatsapp/status"),
        apiRequest<{ contacts: Contact[] }>("admin/whatsapp/contacts"),
        apiRequest<{ messages: Message[] }>("admin/whatsapp/messages"),
        apiRequest<{ rows: PartnerNumber[]; resorts: { id: number; name: string }[] }>(
          "admin/whatsapp/partners",
        ),
        apiRequest<{ rows: WaBooking[] }>("admin/whatsapp/bookings"),
      ]);
      setBookings(bk.data.rows);
      setStatus(s.data);
      setContacts(c.data.contacts);
      setMessages(m.data.messages);
      setPartners(p.data.rows);
      setResorts(p.data.resorts);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load WhatsApp data.");
    }
  }, []);

  useEffect(() => {
    void load();
    // Refresh so new incoming messages and auto-replies show up without a manual reload.
    const timer = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(timer);
  }, [load]);

  // One number per line or comma separated, optionally followed by a name: "9876543210, Asha".
  const parseNumbers = () =>
    numbers
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [phone, ...rest] = line.split(",");
        return { phone: phone.trim(), name: rest.join(",").trim() || undefined };
      });

  const run = async (task: () => Promise<string>) => {
    setBusy(true);
    setNotice("");
    try {
      setNotice(await task());
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  const addContacts = () =>
    run(async () => {
      const list = parseNumbers();
      if (!list.length) return "Enter at least one number.";
      const { data } = await apiRequest<{ added: number; invalid: string[] }>(
        "admin/whatsapp/contacts",
        { method: "POST", body: JSON.stringify({ contacts: list, optedIn: true }) },
      );
      return `Added ${data.added} contact(s).${data.invalid.length ? ` Invalid: ${data.invalid.join(", ")}` : ""}`;
    });

  const sendBulk = () =>
    run(async () => {
      if (!text.trim()) return "Write a message first.";
      const recipients = onlyListed ? parseNumbers().map((item) => item.phone) : undefined;
      if (
        !window.confirm(
          onlyListed
            ? "Send this message to the numbers listed?"
            : `Send this message to all ${status?.optedInContacts ?? 0} opted-in contacts?`,
        )
      )
        return "Cancelled.";
      const { data } = await apiRequest<{ queued: number }>("admin/whatsapp/bulk", {
        method: "POST",
        body: JSON.stringify({ text, recipients }),
      });
      return `Queued ${data.queued} message(s). They are sent with a pause between each.`;
    });

  const connected = status?.session?.status === "ready";

  const addPartner = () =>
    run(async () => {
      if (!partnerResort || !partnerPhone.trim()) return "Choose a property and enter a number.";
      await apiRequest("admin/whatsapp/partners", {
        method: "POST",
        body: JSON.stringify({ resortId: Number(partnerResort), phone: partnerPhone }),
      });
      setPartnerPhone("");
      return "Partner number added.";
    });

  const removePartner = (id: number) =>
    run(async () => {
      await apiRequest(`admin/whatsapp/partners/${id}`, { method: "DELETE" });
      return "Partner number removed.";
    });

  return (
    <section className="whatsapp-admin">
      <p className="eyebrow">WHATSAPP (OPENWA)</p>
      <h2>WhatsApp auto-reply and bulk messages</h2>
      {!status?.configured && (
        <p className="whatsapp-note">
          OpenWA is not configured. Set OPENWA_API_KEY and OPENWA_SESSION_ID in the backend .env.
        </p>
      )}
      <p>
        Session:{" "}
        <strong>
          {status?.session
            ? `${status.session.status}${status.session.phone ? ` (+${status.session.phone})` : ""}`
            : "unknown"}
        </strong>{" "}
        · Auto-reply: <strong>{status?.autoReply ? "on" : "off"}</strong> · Opted-in contacts:{" "}
        <strong>{status?.optedInContacts ?? 0}</strong>
      </p>
      {notice && <p className="whatsapp-note">{notice}</p>}

      <div className="whatsapp-grid">
        <div>
          <h3>Contacts</h3>
          <p>
            One number per line, optional name after a comma. Only add people who agreed to receive
            messages.
          </p>
          <textarea
            rows={6}
            value={numbers}
            placeholder={"9876543210, Asha\n+91 91234 56789"}
            onChange={(event) => setNumbers(event.target.value)}
          />
          <button type="button" disabled={busy} onClick={addContacts}>
            Save contacts
          </button>
        </div>
        <div>
          <h3>Bulk message</h3>
          <p>Use {"{{name}}"} to insert the contact&apos;s name.</p>
          <textarea
            rows={6}
            value={text}
            placeholder="Hello {{name}}, our new offer is live!"
            onChange={(event) => setText(event.target.value)}
          />
          <label>
            <input
              type="checkbox"
              checked={onlyListed}
              onChange={(event) => setOnlyListed(event.target.checked)}
            />{" "}
            Send only to the numbers typed on the left (otherwise all opted-in contacts)
          </label>
          <button type="button" disabled={busy || !connected} onClick={sendBulk}>
            {connected ? "Send bulk message" : "WhatsApp not connected"}
          </button>
        </div>
      </div>

      <h3>Partner staff numbers</h3>
      <p>
        Staff added here get a WhatsApp alert for every new booking or enquiry of their property and
        can reply BOOKINGS, ENQUIRIES, CONFIRM &lt;id&gt; or CANCEL &lt;id&gt;.
      </p>
      <div className="whatsapp-partner-form">
        <select value={partnerResort} onChange={(event) => setPartnerResort(event.target.value)}>
          <option value="">Choose property</option>
          {resorts.map((resort) => (
            <option key={resort.id} value={resort.id}>
              {resort.name}
            </option>
          ))}
        </select>
        <input
          value={partnerPhone}
          placeholder="Staff WhatsApp number"
          onChange={(event) => setPartnerPhone(event.target.value)}
        />
        <button type="button" disabled={busy} onClick={addPartner}>
          Add
        </button>
      </div>
      <div className="whatsapp-table">
        {partners.map((partner) => (
          <div key={partner.id}>
            <span>+{partner.phone}</span>
            <span>{partner.resortName}</span>
            <span />
            <button type="button" disabled={busy} onClick={() => removePartner(partner.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <h3>WhatsApp bookings ({bookings.length})</h3>
      <div className="whatsapp-table">
        {bookings.length === 0 && <p>No WhatsApp bookings yet.</p>}
        {bookings.map((b) => (
          <div key={b.id}>
            <span>
              #{b.id} {b.resortName}
              {b.roomName ? ` · ${b.roomName}` : ""}
            </span>
            <span>
              {b.guestName} (+{b.phone}) · {b.guests} guest(s)
            </span>
            <span>
              {b.checkIn} → {b.checkOut}
            </span>
            <span>
              {b.status}
              {b.paymentStatus ? ` · pay: ${b.paymentStatus}` : ""}
            </span>
          </div>
        ))}
      </div>

      <h3>Recent messages</h3>
      <div className="whatsapp-table">
        {messages.length === 0 && <p>No messages yet.</p>}
        {messages.slice(0, 30).map((message) => (
          <div key={message.id}>
            <span>{message.direction === "in" ? "⬇ in" : "⬆ " + message.kind}</span>
            <span>+{message.phone}</span>
            <span>{message.body}</span>
            <span>{message.status}</span>
          </div>
        ))}
      </div>

      <h3>Contacts ({contacts.length})</h3>
      <div className="whatsapp-table">
        {contacts.slice(0, 50).map((contact) => (
          <div key={contact.phone}>
            <span>+{contact.phone}</span>
            <span>{contact.name || "-"}</span>
            <span>{contact.opted_in ? "opted in" : "opted out"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
