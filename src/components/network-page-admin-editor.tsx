import { useHomeContent, type NetworkPageContent } from "@/lib/home-content";

const textFields: Array<[keyof Omit<NetworkPageContent, "heroMedia">, string]> = [
  ["heroEyebrow", "Eyebrow"],
  ["heroTitle", "Heading"],
  ["heroHighlight", "Highlight"],
];

export function NetworkPageAdminEditor() {
  const { networkPageContent, updateNetworkPageContent, createPreviewMedia, saveStatus } =
    useHomeContent();

  return (
    <section className="experience-admin-hero-settings">
      <div>
        <p className="eyebrow">PUBLIC PAGE APPEARANCE</p>
        <h2>Our Network page hero</h2>
        <p>Update the hero image and copy. Changes are saved to the database.</p>
        {textFields.map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              value={networkPageContent[key]}
              onChange={(event) =>
                updateNetworkPageContent({ ...networkPageContent, [key]: event.target.value })
              }
            />
          </label>
        ))}
        <label>
          Description
          <textarea
            value={networkPageContent.heroDescription}
            onChange={(event) =>
              updateNetworkPageContent({
                ...networkPageContent,
                heroDescription: event.target.value,
              })
            }
          />
        </label>
        <label>
          Replace hero image
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (!file) return;
              updateNetworkPageContent({
                ...networkPageContent,
                heroMedia: createPreviewMedia(file),
              });
              event.currentTarget.value = "";
            }}
          />
        </label>
        <p className="experience-admin-save-status" role="status">
          {saveStatus.message ?? "Changes save automatically."}
        </p>
      </div>
      <img src={networkPageContent.heroMedia.src} alt="Current network page hero" />
    </section>
  );
}
