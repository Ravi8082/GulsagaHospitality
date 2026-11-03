import { Eye, EyeOff } from "lucide-react";
import {
  destinationSections,
  footerPages,
  footerSections,
  useHomeContent,
  visibilityPages,
  visibilitySections,
} from "@/lib/home-content";

export function VisibilityAdminEditor() {
  const { visibility, updateVisibility } = useHomeContent();
  const hidden = Array.isArray(visibility.hidden) ? visibility.hidden : [];

  const toggle = (id: string) =>
    updateVisibility({
      hidden: hidden.includes(id) ? hidden.filter((item) => item !== id) : [...hidden, id],
    });

  const group = (title: string, note: string, items: readonly { id: string; label: string }[]) => (
    <section className="home-editor-section">
      <h3>{title}</h3>
      <p className="preview-note">{note}</p>
      <ul className="visibility-list">
        {items.map(({ id, label }) => {
          const shown = !hidden.includes(id);
          return (
            <li key={id}>
              <span>
                {shown ? <Eye size={16} /> : <EyeOff size={16} />} {label}
                <small>{id}</small>
              </span>
              <label className="visibility-switch">
                <input type="checkbox" checked={shown} onChange={() => toggle(id)} />
                <span>{shown ? "Visible" : "Hidden"}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <div className="home-editor">
      <div className="home-editor-toolbar">
        <div>
          <p className="eyebrow">EDIT THE WEBSITE PREVIEW</p>
          <h2>Page & section visibility</h2>
        </div>
      </div>
      <div className="home-editor-notice" role="note">
        <strong>Saved to the database</strong>
        <span>
          Hidden pages disappear from the menu and show a "not available" message if opened
          directly. Changes are recorded in the revision history.
        </span>
      </div>
      {group("Website pages", "Turn a whole page (and its menu link) on or off.", visibilityPages)}
      {group("Home page sections", "Show or hide each block of the home page.", visibilitySections)}
      {group(
        "Destinations page sections",
        "Choose which blocks appear on the Destinations page.",
        destinationSections,
      )}
      {group("Footer", "Applies to the footer on every page.", footerSections)}
      {group(
        "Footer on each page",
        "Choose which pages show the footer. Pages not listed here always show it.",
        footerPages,
      )}
    </div>
  );
}
