import { Link } from "@tanstack/react-router";
import { Compass, MapPin } from "lucide-react";
import { useHomeContent } from "@/lib/home-content";
import { defaultDestinationPitches, findDestinationPitch } from "@/lib/membership-data";

// Admin-written "what to see and do" card that nudges visitors to join a membership.
export function DestinationPitch({ place, className = "" }: { place: string; className?: string }) {
  const { membershipPageContent } = useHomeContent();
  const pitch = findDestinationPitch(
    membershipPageContent.destinationPitches ?? defaultDestinationPitches,
    place,
  );
  if (!pitch) return null;
  return (
    <aside className={`dpitch ${className}`.trim()}>
      <p className="dpitch-eyebrow">Planning {pitch.name}?</p>
      <h3>{pitch.tagline}</h3>
      <div className="dpitch-cols">
        <div>
          <h4>
            <MapPin size={14} /> Famous nearby
          </h4>
          <ul>
            {pitch.nearby.filter(Boolean).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>
            <Compass size={14} /> What you can do
          </h4>
          <ul>
            {pitch.activities.filter(Boolean).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      <Link className="dpitch-btn" to="/membership/join" search={{}}>
        {membershipPageContent.destinationPitchCta ?? "Join Gulsaga Premium"}
      </Link>
    </aside>
  );
}
