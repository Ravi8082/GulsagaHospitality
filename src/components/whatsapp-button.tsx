// Floating WhatsApp button shown on every page that uses the shared Layout.
// Opens a chat with the business number; the OpenWA bot on the backend answers automatically.
const WHATSAPP_NUMBER = (import.meta.env.VITE_WHATSAPP_NUMBER || "917304645336").replace(/\D/g, "");
const WHATSAPP_TEXT = "Hello Gulsaga, I would like to know more.";

export function WhatsAppButton() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;
  return (
    <a
      className="whatsapp-fab"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
    >
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" fill="currentColor">
        <path d="M16.003 3C9.38 3 4 8.38 4 15c0 2.37.69 4.58 1.88 6.45L4 29l7.7-1.84A11.94 11.94 0 0 0 16 27c6.62 0 12-5.38 12-12S22.62 3 16.003 3Zm0 21.8c-1.9 0-3.67-.55-5.16-1.5l-.37-.22-4.57 1.09 1.1-4.45-.24-.38A9.76 9.76 0 0 1 6.2 15c0-5.4 4.4-9.8 9.8-9.8s9.8 4.4 9.8 9.8-4.4 9.8-9.8 9.8Zm5.37-7.33c-.29-.15-1.74-.86-2.01-.96-.27-.1-.47-.15-.66.15-.2.29-.76.96-.93 1.16-.17.2-.34.22-.64.07-.29-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.51-.07-.15-.66-1.59-.9-2.18-.24-.57-.48-.49-.66-.5h-.56c-.2 0-.51.07-.78.37-.27.29-1.02 1-1.02 2.44s1.05 2.83 1.2 3.03c.15.2 2.06 3.15 5 4.41.7.3 1.24.48 1.67.62.7.22 1.34.19 1.85.12.56-.08 1.74-.71 1.98-1.4.24-.69.24-1.28.17-1.4-.07-.12-.27-.2-.56-.34Z" />
      </svg>
    </a>
  );
}
