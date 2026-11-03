import { useState } from "react";
import { ArrowUpRight, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { MediaField, TextField } from "@/components/home-page-editor";
import { Button } from "@/components/ui/button";
import { initialLoginPageContent, useHomeContent, type LoginPageContent } from "@/lib/home-content";

export function LoginPageAdminEditor() {
  const { loginPageContent, updateLoginPageContent } = useHomeContent();
  const [draft, setDraft] = useState(loginPageContent);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof LoginPageContent>(key: K, value: LoginPageContent[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const apply = () => {
    updateLoginPageContent(draft);
    setSaved(true);
  };

  const reset = () => {
    setDraft(initialLoginPageContent);
    updateLoginPageContent(initialLoginPageContent);
    setSaved(true);
  };

  return (
    <div className="home-editor">
      <div className="home-editor-toolbar">
        <div>
          <p className="eyebrow">EDIT THE WEBSITE PREVIEW</p>
          <h2>Login page (Member, Partner &amp; Admin)</h2>
        </div>
        <Button variant="outline" asChild>
          <Link to="/login">
            View login page <ArrowUpRight />
          </Link>
        </Button>
      </div>

      <div className="home-editor-notice" role="note">
        <strong>Saved to the database</strong>
        <span>
          One login page serves all three roles. The image and texts below are loaded from the
          database. Sign-in security itself is not editable here.
        </span>
      </div>

      <section className="home-editor-section">
        <h3>Cinematic image</h3>
        <div className="home-editor-fields">
          <MediaField
            label="Login background image"
            media={draft.background}
            imageOnly
            onChange={(background) => set("background", background)}
          />
        </div>
      </section>

      <section className="home-editor-section">
        <h3>Welcome panel</h3>
        <div className="home-editor-fields">
          <TextField
            label="Headline"
            value={draft.headline}
            onChange={(value) => set("headline", value)}
          />
          <TextField
            label="Introduction"
            value={draft.intro}
            multiline
            onChange={(value) => set("intro", value)}
          />
          {draft.highlights.map((item, index) => (
            <div className="footer-editor-row" key={`highlight-${index}`}>
              <TextField
                label={`Highlight ${index + 1}`}
                value={item}
                onChange={(value) =>
                  set(
                    "highlights",
                    draft.highlights.map((current, i) => (i === index ? value : current)),
                  )
                }
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  set(
                    "highlights",
                    draft.highlights.filter((_, i) => i !== index),
                  )
                }
              >
                <Trash2 /> Remove
              </Button>
            </div>
          ))}
          {draft.highlights.length < 8 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => set("highlights", [...draft.highlights, "New highlight"])}
            >
              <Plus /> Add highlight
            </Button>
          ) : null}
        </div>
      </section>

      <section className="home-editor-section">
        <h3>Login form</h3>
        <div className="home-editor-fields">
          <TextField
            label="Form title"
            value={draft.formTitle}
            onChange={(value) => set("formTitle", value)}
          />
          <TextField
            label="Form subtitle"
            value={draft.formSubtitle}
            onChange={(value) => set("formSubtitle", value)}
          />
        </div>
      </section>

      <div className="home-editor-actions">
        <Button type="button" onClick={apply}>
          <Save /> Save login page
        </Button>
        <Button type="button" variant="outline" onClick={reset}>
          <RotateCcw /> Reset to defaults
        </Button>
        {saved ? (
          <span role="status">Saved. Visitors will see this after the database save.</span>
        ) : null}
      </div>
    </div>
  );
}
