import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaField, TextField } from "@/components/home-page-editor";
import {
  destinationSlug,
  initialDestinations,
  type Destination,
  type DestinationDetail,
  type DestinationFaq,
  type DestinationPlace,
} from "@/lib/destination-data";
import { initialDestinationPageContent, useHomeContent, type HomeMedia } from "@/lib/home-content";

export function DestinationAdminEditor() {
  const { destinationPageContent, destinations, updateDestinationPageContent, updateDestinations } =
    useHomeContent();

  const updateDestination = (id: string, change: Partial<Destination>) => {
    updateDestinations(
      destinations.map((destination) =>
        destination.id === id ? { ...destination, ...change } : destination,
      ),
    );
  };

  const updateMapCoordinate = (id: string, axis: "mapX" | "mapY", value: string) => {
    const coordinate = Number(value);
    if (!Number.isFinite(coordinate) || coordinate < 0 || coordinate > 100) return;
    updateDestination(id, { [axis]: coordinate });
  };

  const addDestination = () => {
    const example = initialDestinations[0];
    if (!example) throw new Error("Missing the default destination");

    updateDestinations([
      ...destinations,
      {
        ...example,
        id: `destination-${Date.now()}`,
        name: "New destination",
        subtitle: "Add a short destination theme",
        description: "Add a destination description.",
        categories: ["Nature Retreats"],
        resortName: "Add a featured resort",
        location: "Add a location",
      },
    ]);
  };

  return (
    <div className="home-editor">
      <div className="home-editor-toolbar">
        <div>
          <p className="eyebrow">EDIT THE WEBSITE PREVIEW</p>
          <h2>Destinations</h2>
        </div>
        <div className="destination-editor-actions">
          <Button variant="outline" asChild>
            <a href="/destinations" target="_blank" rel="noreferrer">
              View destinations page
            </a>
          </Button>{" "}
          <Button variant="outline" onClick={() => updateDestinations(initialDestinations)}>
            <RotateCcw /> Reset destinations
          </Button>
          <Button variant="outline" onClick={addDestination}>
            <Plus /> Add destination
          </Button>
        </div>
      </div>

      <div className="home-editor-notice" role="note">
        <strong>Saved to the database</strong>
        <span>
          Destination page changes are saved automatically when signed in as an administrator.
          Images up to 50 MB and videos up to 100 MB are uploaded to the server.
        </span>
      </div>

      <section className="home-editor-section">
        <div className="destination-editor-heading">
          <h3>Page hero, collection & map</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateDestinationPageContent(initialDestinationPageContent)}
          >
            <RotateCcw /> Reset page content
          </Button>
        </div>
        <div className="home-editor-fields">
          <TextField
            label="Hero eyebrow"
            value={destinationPageContent.eyebrow}
            onChange={(eyebrow) =>
              updateDestinationPageContent({ ...destinationPageContent, eyebrow })
            }
          />
          <TextField
            label="Hero heading"
            value={destinationPageContent.heading}
            onChange={(heading) =>
              updateDestinationPageContent({ ...destinationPageContent, heading })
            }
          />
          <TextField
            label="Hero description"
            value={destinationPageContent.description}
            onChange={(description) =>
              updateDestinationPageContent({ ...destinationPageContent, description })
            }
            multiline
          />
          <TextField
            label="Primary button"
            value={destinationPageContent.primaryLabel}
            onChange={(primaryLabel) =>
              updateDestinationPageContent({ ...destinationPageContent, primaryLabel })
            }
          />
          <TextField
            label="Secondary button"
            value={destinationPageContent.secondaryLabel}
            onChange={(secondaryLabel) =>
              updateDestinationPageContent({ ...destinationPageContent, secondaryLabel })
            }
          />
          <TextField
            label="Collection heading"
            value={destinationPageContent.collectionHeading}
            onChange={(collectionHeading) =>
              updateDestinationPageContent({ ...destinationPageContent, collectionHeading })
            }
          />
          <MediaField
            label="Hero background image or video"
            media={destinationPageContent.heroMedia}
            onChange={(heroMedia) =>
              updateDestinationPageContent({ ...destinationPageContent, heroMedia })
            }
          />
          <MediaField
            label="Map background image or video"
            media={destinationPageContent.mapImage}
            onChange={(mapImage) =>
              updateDestinationPageContent({ ...destinationPageContent, mapImage })
            }
          />
        </div>
      </section>

      {destinations.map((destination, index) => (
        <section className="home-editor-section" key={destination.id}>
          <div className="destination-editor-heading">
            <h3>{destination.name || `Destination ${index + 1}`}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                updateDestinations(destinations.filter((item) => item.id !== destination.id))
              }
            >
              <Trash2 /> Remove
            </Button>
          </div>
          <div className="home-editor-fields">
            <TextField
              label="Destination name"
              value={destination.name}
              onChange={(name) => updateDestination(destination.id, { name })}
            />
            <TextField
              label="Card subtitle"
              value={destination.subtitle}
              onChange={(subtitle) => updateDestination(destination.id, { subtitle })}
            />
            <TextField
              label="Featured resort"
              value={destination.resortName}
              onChange={(resortName) => updateDestination(destination.id, { resortName })}
            />
            <TextField
              label="Location"
              value={destination.location}
              onChange={(location) => updateDestination(destination.id, { location })}
            />
            <TextField
              inputType="number"
              label="Map point horizontal position (%)"
              value={String(destination.mapX)}
              onChange={(value) => updateMapCoordinate(destination.id, "mapX", value)}
            />
            <TextField
              inputType="number"
              label="Map point vertical position (%)"
              value={String(destination.mapY)}
              onChange={(value) => updateMapCoordinate(destination.id, "mapY", value)}
            />
            <TextField
              label="Categories (comma separated)"
              value={destination.categories.join(", ")}
              onChange={(value) =>
                updateDestination(destination.id, {
                  categories: value
                    .split(",")
                    .map((category) => category.trim())
                    .filter(Boolean),
                })
              }
            />
            <TextField
              label="Description"
              value={destination.description}
              onChange={(description) => updateDestination(destination.id, { description })}
              multiline
            />
            <MediaField
              label="Destination image or video"
              media={destination.media}
              onChange={(media) => updateDestination(destination.id, { media })}
            />
            <DetailFields
              destination={destination}
              onChange={(detail) =>
                updateDestination(destination.id, { detail: { ...destination.detail, ...detail } })
              }
              onSlug={(slug) => updateDestination(destination.id, { slug })}
            />
          </div>
        </section>
      ))}
    </div>
  );
}

const emptyMedia = (name: string): HomeMedia => ({ name, src: "", type: "image" });
const list = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

function DetailFields({
  destination,
  onChange,
  onSlug,
}: {
  destination: Destination;
  onChange: (detail: DestinationDetail) => void;
  onSlug: (slug: string) => void;
}) {
  const detail = destination.detail ?? {};
  const places = detail.places ?? [];
  const gallery = detail.gallery ?? [];
  const faqs = detail.faqs ?? [];
  const setPlace = (index: number, change: Partial<DestinationPlace>) =>
    onChange({
      places: places.map((place, i) => (i === index ? { ...place, ...change } : place)),
    });
  const setFaq = (index: number, change: Partial<DestinationFaq>) =>
    onChange({ faqs: faqs.map((faq, i) => (i === index ? { ...faq, ...change } : faq)) });
  const coordinate = (value: string) => (value.trim() === "" ? null : Number(value));

  return (
    <>
      <h4 className="destination-editor-subheading">Destination detail page</h4>
      <TextField
        label="Page address (slug, e.g. meghalaya)"
        value={destination.slug ?? destinationSlug(destination)}
        onChange={onSlug}
      />
      <TextField
        label="Tagline"
        value={detail.tagline ?? ""}
        onChange={(tagline) => onChange({ tagline })}
      />
      <TextField
        label="Story"
        multiline
        value={detail.story ?? ""}
        onChange={(story) => onChange({ story })}
      />
      <TextField
        label="Hero highlights (comma separated)"
        value={(detail.highlights ?? []).join(", ")}
        onChange={(value) => onChange({ highlights: list(value) })}
      />
      <TextField
        label="Experiences (comma separated)"
        value={(detail.experiences ?? []).join(", ")}
        onChange={(value) => onChange({ experiences: list(value) })}
      />
      <TextField
        label="Best time to visit"
        value={detail.bestTime ?? ""}
        onChange={(bestTime) => onChange({ bestTime })}
      />
      <TextField
        label="Weather"
        value={detail.weather ?? ""}
        onChange={(weather) => onChange({ weather })}
      />
      <TextField
        label="Nearest airport"
        value={detail.nearestAirport ?? ""}
        onChange={(nearestAirport) => onChange({ nearestAirport })}
      />
      <TextField
        label="Nearest railway station"
        value={detail.nearestRailway ?? ""}
        onChange={(nearestRailway) => onChange({ nearestRailway })}
      />
      <TextField
        label="Ideal trip duration"
        value={detail.idealDuration ?? ""}
        onChange={(idealDuration) => onChange({ idealDuration })}
      />
      <TextField
        label="How to reach"
        multiline
        value={detail.howToReach ?? ""}
        onChange={(howToReach) => onChange({ howToReach })}
      />
      <TextField
        label="Local transport"
        multiline
        value={detail.localTransport ?? ""}
        onChange={(localTransport) => onChange({ localTransport })}
      />
      <TextField
        inputType="number"
        label="Map latitude (leave empty to hide map)"
        value={detail.latitude == null ? "" : String(detail.latitude)}
        onChange={(value) => onChange({ latitude: coordinate(value) })}
      />
      <TextField
        inputType="number"
        label="Map longitude"
        value={detail.longitude == null ? "" : String(detail.longitude)}
        onChange={(value) => onChange({ longitude: coordinate(value) })}
      />
      <MediaField
        label="Destination video (optional)"
        media={detail.video ?? emptyMedia("Destination video")}
        onChange={(video) => onChange({ video })}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange({ video: null })}
        disabled={!detail.video}
      >
        <Trash2 /> Remove video
      </Button>

      <h4 className="destination-editor-subheading">Attractions</h4>
      {places.map((place, index) => (
        <div key={index} className="destination-editor-subitem">
          <TextField
            label="Attraction name"
            value={place.name}
            onChange={(name) => setPlace(index, { name })}
          />
          <TextField
            label="Description"
            multiline
            value={place.description}
            onChange={(description) => setPlace(index, { description })}
          />
          <MediaField
            label="Attraction image"
            media={place.media ?? emptyMedia(place.name || "Attraction")}
            onChange={(media) => setPlace(index, { media })}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ places: places.filter((_, i) => i !== index) })}
          >
            <Trash2 /> Remove attraction
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          onChange({ places: [...places, { name: "", description: "", media: null }] })
        }
      >
        <Plus /> Add attraction
      </Button>

      <h4 className="destination-editor-subheading">Gallery</h4>
      {gallery.map((item, index) => (
        <div key={index} className="destination-editor-subitem">
          <MediaField
            label={`Gallery item ${index + 1}`}
            media={item}
            onChange={(media) =>
              onChange({ gallery: gallery.map((current, i) => (i === index ? media : current)) })
            }
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ gallery: gallery.filter((_, i) => i !== index) })}
          >
            <Trash2 /> Remove
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange({ gallery: [...gallery, emptyMedia("Gallery item")] })}
      >
        <Plus /> Add gallery item
      </Button>

      <h4 className="destination-editor-subheading">FAQs</h4>
      {faqs.map((faq, index) => (
        <div key={index} className="destination-editor-subitem">
          <TextField
            label="Question"
            value={faq.question}
            onChange={(question) => setFaq(index, { question })}
          />
          <TextField
            label="Answer"
            multiline
            value={faq.answer}
            onChange={(answer) => setFaq(index, { answer })}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ faqs: faqs.filter((_, i) => i !== index) })}
          >
            <Trash2 /> Remove
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange({ faqs: [...faqs, { question: "", answer: "" }] })}
      >
        <Plus /> Add FAQ
      </Button>
    </>
  );
}
