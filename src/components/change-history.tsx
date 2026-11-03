import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AUTH_EVENT } from "@/lib/auth-token";
import { apiRequest } from "@/lib/experience-api";

type Revision = {
  id: number;
  content_key: string;
  version: number;
  action: string;
  admin_email: string | null;
  created_at: string;
};
type CollectionChange = {
  id: number;
  collection: string;
  record_id: string;
  action: string;
  admin_email: string | null;
  created_at: string;
};

const when = (value: string) => new Date(value).toLocaleString();

export function ChangeHistory() {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [changes, setChanges] = useState<CollectionChange[]>([]);
  const [message, setMessage] = useState("Loading history…");

  const load = useCallback(async () => {
    try {
      const { data } = await apiRequest<{
        revisions: Revision[];
        collections: CollectionChange[];
      }>("admin/site-content/changes/all");
      setRevisions(data.revisions);
      setChanges(data.collections);
      setMessage("");
    } catch {
      setMessage("Sign in as an administrator to view the change history.");
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener(AUTH_EVENT, load);
    return () => window.removeEventListener(AUTH_EVENT, load);
  }, [load]);

  const restore = async (revision: Revision) => {
    if (!window.confirm(`Restore "${revision.content_key}" to version ${revision.version}?`))
      return;
    try {
      await apiRequest(
        `admin/site-content/${revision.content_key}/revisions/${revision.id}/restore`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      window.location.reload();
    } catch {
      setMessage("Restore failed.");
    }
  };

  return (
    <section className="live-panel">
      <h2>Change history</h2>
      <p>
        Every saved change is recorded with the administrator and time. Page content can be
        restored.
      </p>
      {message ? <p role="status">{message}</p> : null}

      <h3>Page content</h3>
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Content</th>
            <th>Version</th>
            <th>Action</th>
            <th>By</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {revisions.map((revision) => (
            <tr key={revision.id}>
              <td>{when(revision.created_at)}</td>
              <td>{revision.content_key}</td>
              <td>{revision.version}</td>
              <td>{revision.action}</td>
              <td>{revision.admin_email ?? "—"}</td>
              <td>
                <Button size="sm" variant="outline" onClick={() => void restore(revision)}>
                  Restore
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Resorts, destinations, network, experiences, contact and links</h3>
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Collection</th>
            <th>Record</th>
            <th>Action</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change) => (
            <tr key={change.id}>
              <td>{when(change.created_at)}</td>
              <td>{change.collection}</td>
              <td>{change.record_id}</td>
              <td>{change.action}</td>
              <td>{change.admin_email ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
