import { useState, type ChangeEvent } from "react";
import { ImagePlus, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaField, TextField } from "@/components/home-page-editor";
import {
  useHomeContent,
  type Resort,
  type ResortPageContent,
  type ResortRoom,
} from "@/lib/home-content";
import { initialResortPageContent, initialResorts } from "@/lib/resort-data";

export function ResortAdminEditor({ search = "" }: { search?: string }) {
  const { resortPageContent, updateResortPageContent, resorts, updateResorts, createPreviewMedia } =
    useHomeContent();

  const updateResort = (id: string, change: Partial<Resort>) => {
    updateResorts(resorts.map((resort) => (resort.id === id ? { ...resort, ...change } : resort)));
  };

  const updateHighlight = (index: number, value: string) => {
    const highlights: ResortPageContent["highlights"] = [...resortPageContent.highlights];
    highlights[index] = value;
    updateResortPageContent({ ...resortPageContent, highlights });
  };

  const addResort = () => {
    const example = initialResorts[0];
    if (!example) throw new Error("Missing the default resort");

    updateResorts([
      ...resorts,
      {
        ...example,
        id: `resort-${Date.now()}`,
        name: "New resort",
        region: "Add a destination",
        location: "Add a location",
        description: "Add a resort description.",
        tags: ["Resort feature", "Member benefit"],
      },
    ]);
  };

  return (
    <div className="home-editor">
      <div className="home-editor-toolbar">
        <div>
          <p className="eyebrow">EDIT THE WEBSITE PREVIEW</p>
          <h2>Resorts & Properties</h2>
        </div>
        <div className="destination-editor-actions">
          <Button variant="outline" onClick={() => updateResorts(initialResorts)}>
            <RotateCcw /> Reset resorts
          </Button>
          <Button variant="outline" onClick={addResort}>
            <Plus /> Add resort
          </Button>
        </div>
      </div>

      <div className="home-editor-notice" role="note">
        <strong>Saved to the database</strong>
        <span>
          Resort page changes and uploads are saved automatically when signed in as an
          administrator, with revision history.
        </span>
      </div>

      <div className="search-field resort-admin-search" role="status">
        <Search size={18} />
        <span>
          {search
            ? `Showing matches for “${search}”`
            : "Use the dashboard search to find a property"}
        </span>
        <strong>{resorts.length} preview properties</strong>
      </div>

      <section className="home-editor-section">
        <div className="destination-editor-heading">
          <h3>Hero, buttons & resort collection</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateResortPageContent(initialResortPageContent)}
          >
            <RotateCcw /> Reset page content
          </Button>
        </div>
        <div className="home-editor-fields">
          <TextField
            label="Hero eyebrow"
            value={resortPageContent.eyebrow}
            onChange={(eyebrow) => updateResortPageContent({ ...resortPageContent, eyebrow })}
          />
          <TextField
            label="Hero heading"
            value={resortPageContent.heading}
            onChange={(heading) => updateResortPageContent({ ...resortPageContent, heading })}
          />
          <TextField
            label="Hero description"
            value={resortPageContent.description}
            onChange={(description) =>
              updateResortPageContent({ ...resortPageContent, description })
            }
            multiline
          />
          <TextField
            label="Primary button"
            value={resortPageContent.primaryLabel}
            onChange={(primaryLabel) =>
              updateResortPageContent({ ...resortPageContent, primaryLabel })
            }
          />
          <TextField
            label="Secondary button"
            value={resortPageContent.secondaryLabel}
            onChange={(secondaryLabel) =>
              updateResortPageContent({ ...resortPageContent, secondaryLabel })
            }
          />
          <TextField
            label="Collection heading"
            value={resortPageContent.collectionHeading}
            onChange={(collectionHeading) =>
              updateResortPageContent({ ...resortPageContent, collectionHeading })
            }
          />
          {resortPageContent.highlights.map((highlight, index) => (
            <TextField
              key={`highlight-${index}`}
              label={`Highlight ${index + 1}`}
              value={highlight}
              onChange={(value) => updateHighlight(index, value)}
            />
          ))}
          <MediaField
            label="Hero background image or video"
            media={resortPageContent.heroMedia}
            onChange={(heroMedia) => updateResortPageContent({ ...resortPageContent, heroMedia })}
          />
        </div>
      </section>

      {resorts
        .filter((resort) =>
          `${resort.name} ${resort.region} ${resort.location}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .map((resort, index) => (
          <section className="home-editor-section" key={resort.id}>
            <div className="destination-editor-heading">
              <h3>{resort.name || `Resort ${index + 1}`}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateResorts(resorts.filter((item) => item.id !== resort.id))}
              >
                <Trash2 /> Remove
              </Button>
            </div>
            <div className="home-editor-fields">
              <TextField
                label="Resort name"
                value={resort.name}
                onChange={(name) => updateResort(resort.id, { name })}
              />
              <TextField
                label="Destination category"
                value={resort.region}
                onChange={(region) => updateResort(resort.id, { region })}
              />
              <TextField
                label="Location"
                value={resort.location}
                onChange={(location) => updateResort(resort.id, { location })}
              />
              <TextField
                label="Short description"
                value={resort.description}
                onChange={(description) => updateResort(resort.id, { description })}
                multiline
              />
              <TextField
                label="First card tag"
                value={resort.tags[0]}
                onChange={(value) => updateResort(resort.id, { tags: [value, resort.tags[1]] })}
              />
              <TextField
                label="Second card tag"
                value={resort.tags[1]}
                onChange={(value) => updateResort(resort.id, { tags: [resort.tags[0], value] })}
              />
              <MediaField
                label="Resort card image or video"
                media={resort.media}
                onChange={(media) => updateResort(resort.id, { media })}
              />
              <TextField
                label="Detail page category"
                value={resort.detail.category}
                onChange={(category) =>
                  updateResort(resort.id, {
                    detail: { ...resort.detail, category },
                  })
                }
              />
              <TextField
                label="Full resort description"
                value={resort.detail.longDescription}
                onChange={(longDescription) =>
                  updateResort(resort.id, {
                    detail: { ...resort.detail, longDescription },
                  })
                }
                multiline
              />
              <label className="home-editor-field resort-verified-toggle">
                Verified partner badge
                <span>
                  <input
                    checked={resort.detail.verifiedPartner}
                    onChange={(event) =>
                      updateResort(resort.id, {
                        detail: { ...resort.detail, verifiedPartner: event.target.checked },
                      })
                    }
                    type="checkbox"
                  />
                  Enable only after partner verification is completed.
                </span>
              </label>
              <div className="home-editor-detail-list">
                <div className="destination-editor-heading">
                  <h4>Property gallery</h4>
                  <GalleryImageUpload
                    onUpload={(media) =>
                      updateResort(resort.id, {
                        detail: { ...resort.detail, gallery: [...resort.detail.gallery, media] },
                      })
                    }
                    createPreviewMedia={createPreviewMedia}
                  />
                </div>
                <p className="home-editor-help">
                  Uploading actual images is preferred; detail media stays in this browser preview.
                </p>
                {resort.detail.gallery.map((media, mediaIndex) => (
                  <div className="home-editor-detail-item" key={`${media.name}-${mediaIndex}`}>
                    <MediaField
                      label={`Gallery item ${mediaIndex + 1}`}
                      media={media}
                      onChange={(nextMedia) =>
                        updateResort(resort.id, {
                          detail: {
                            ...resort.detail,
                            gallery: resort.detail.gallery.map((item, itemIndex) =>
                              itemIndex === mediaIndex ? nextMedia : item,
                            ),
                          },
                        })
                      }
                      imageOnly
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateResort(resort.id, {
                          detail: {
                            ...resort.detail,
                            gallery: resort.detail.gallery.filter(
                              (_, itemIndex) => itemIndex !== mediaIndex,
                            ),
                          },
                        })
                      }
                    >
                      <Trash2 /> Remove image
                    </Button>
                  </div>
                ))}
              </div>
              <MediaField
                label="Resort video"
                media={resort.detail.video}
                onChange={(video) =>
                  updateResort(resort.id, { detail: { ...resort.detail, video } })
                }
              />
              <div className="home-editor-detail-list">
                <div className="destination-editor-heading">
                  <h4>Rooms & suites</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateResort(resort.id, {
                        detail: {
                          ...resort.detail,
                          rooms: [
                            ...resort.detail.rooms,
                            {
                              name: "New room option",
                              capacity: "Confirm capacity",
                              description: "Add room details.",
                              amenities: [],
                              image: resort.media,
                              previewOnly: true,
                            },
                          ],
                        },
                      })
                    }
                  >
                    <Plus /> Add room
                  </Button>
                </div>
                {resort.detail.rooms.map((room, roomIndex) => (
                  <div className="home-editor-detail-item" key={`room-${roomIndex}`}>
                    <MediaField
                      label={`Room ${roomIndex + 1} photo`}
                      media={room.image}
                      onChange={(image) =>
                        updateRoom(resort.id, roomIndex, { image }, resorts, updateResorts)
                      }
                      imageOnly
                    />
                    <TextField
                      label={`Room ${roomIndex + 1} name`}
                      value={room.name}
                      onChange={(name) =>
                        updateRoom(resort.id, roomIndex, { name }, resorts, updateResorts)
                      }
                    />
                    <TextField
                      label="Guest capacity"
                      value={room.capacity}
                      onChange={(capacity) =>
                        updateRoom(resort.id, roomIndex, { capacity }, resorts, updateResorts)
                      }
                    />
                    <TextField
                      label="Room description"
                      value={room.description}
                      onChange={(description) =>
                        updateRoom(resort.id, roomIndex, { description }, resorts, updateResorts)
                      }
                      multiline
                    />
                    <TextField
                      label="Room amenities (one per line)"
                      value={room.amenities.join("\n")}
                      onChange={(value) =>
                        updateRoom(
                          resort.id,
                          roomIndex,
                          { amenities: toLines(value) },
                          resorts,
                          updateResorts,
                        )
                      }
                      multiline
                    />
                    <label className="home-editor-field resort-verified-toggle">
                      Room information status
                      <span>
                        <input
                          checked={room.previewOnly}
                          onChange={(event) =>
                            updateRoom(
                              resort.id,
                              roomIndex,
                              { previewOnly: event.target.checked },
                              resorts,
                              updateResorts,
                            )
                          }
                          type="checkbox"
                        />
                        Mark as preview / unverified
                      </span>
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateResort(resort.id, {
                          detail: {
                            ...resort.detail,
                            rooms: resort.detail.rooms.filter(
                              (_, itemIndex) => itemIndex !== roomIndex,
                            ),
                          },
                        })
                      }
                    >
                      <Trash2 /> Remove room
                    </Button>
                  </div>
                ))}
              </div>
              <TextField
                label="Facilities & amenities (one per line)"
                value={resort.detail.amenities.join("\n")}
                onChange={(value) =>
                  updateResort(resort.id, {
                    detail: { ...resort.detail, amenities: toLines(value) },
                  })
                }
                multiline
              />
              <TextField
                label="Experiences (one per line)"
                value={resort.detail.experiences.join("\n")}
                onChange={(value) =>
                  updateResort(resort.id, {
                    detail: { ...resort.detail, experiences: toLines(value) },
                  })
                }
                multiline
              />
              <TextField
                label="Nearby attractions / recommendations (one per line)"
                value={resort.detail.nearbyAttractions.join("\n")}
                onChange={(value) =>
                  updateResort(resort.id, {
                    detail: { ...resort.detail, nearbyAttractions: toLines(value) },
                  })
                }
                multiline
              />
              <TextField
                label="How to reach"
                value={resort.detail.howToReach}
                onChange={(howToReach) =>
                  updateResort(resort.id, {
                    detail: { ...resort.detail, howToReach },
                  })
                }
                multiline
              />
              <TextField
                label="Membership benefits (one per line)"
                value={resort.detail.membershipBenefits.join("\n")}
                onChange={(value) =>
                  updateResort(resort.id, {
                    detail: { ...resort.detail, membershipBenefits: toLines(value) },
                  })
                }
                multiline
              />
            </div>
          </section>
        ))}
    </div>
  );
}

function toLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function updateRoom(
  resortId: string,
  roomIndex: number,
  change: Partial<ResortRoom>,
  resorts: Resort[],
  updateResorts: (resorts: Resort[]) => void,
) {
  updateResorts(
    resorts.map((resort) =>
      resort.id === resortId
        ? {
            ...resort,
            detail: {
              ...resort.detail,
              rooms: resort.detail.rooms.map((room, index) =>
                index === roomIndex ? { ...room, ...change } : room,
              ),
            },
          }
        : resort,
    ),
  );
}

function GalleryImageUpload({
  onUpload,
  createPreviewMedia,
}: {
  onUpload: (media: Resort["media"]) => void;
  createPreviewMedia: (file: File) => Resort["media"];
}) {
  const [error, setError] = useState("");

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
      setError("Choose a JPG, PNG, WebP or AVIF image.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Images can be up to 20 MB.");
      return;
    }

    setError("");
    onUpload(createPreviewMedia(file));
  };

  return (
    <label className="home-editor-gallery-upload">
      <ImagePlus size={16} /> Add image
      <input
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleUpload}
        type="file"
      />
      {error && <span role="alert">{error}</span>}
    </label>
  );
}
