# Gulsaga Hospitality

Gulsaga Hospitality website (frontend).

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

`npm run dev` starts the local development stack: it checks the MySQL server configured in the
backend's `.env`, starts the Windows `MySQL80` service if needed, reuses or starts the API, and then
starts the frontend. The backend must be available in `./backend` or in the folder named by
`GULSAGA_BACKEND_DIR`, with its dependencies and `.env` configured. Set `MYSQL_SERVICE_NAME` if the
Windows MySQL service has a different name. The API URL comes from `VITE_API_BASE_URL` or the
backend's `API_PUBLIC_URL`. To run only the presentation preview without starting or checking the
backend, use `npm run dev:frontend`.

## WhatsApp assistant

The backend talks to a self-hosted OpenWA gateway (port 2785) and replies only to people who start a chat from the website's WhatsApp button, partner staff and admin numbers.

- Link a number: start the gateway, call `POST /api/sessions/<id>/start`, then scan the QR from `GET /api/sessions/<id>/qr` (WhatsApp → Linked devices).
- Backend `.env`: `OPENWA_*` (gateway), `WHATSAPP_ADMIN_NUMBERS` (head-office alerts), `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `WHATSAPP_ADVANCE_PERCENT` (payment links in chat).
- Partner staff numbers: Admin → WhatsApp → Partner numbers. Staff reply `CONFIRM <id>` / `CANCEL <id>`.
- Guests can send BOOK, MEMBERSHIP, STATUS, PAY, TEAM, MENU.
- `npm run dev` also starts OpenWA when it is not running.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Newsletter email verification

The footer newsletter form sends six-digit, randomly generated email verification codes with Resend.
Configure these server-only environment variables in the Node.js runtime before enabling delivery:

```sh
RESEND_API_KEY=re_your_server_side_key
RESEND_FROM_EMAIL=Gulsaga Hospitality <verified-sender@example.com>
```

Do not prefix these values with `VITE_` or expose them in browser code. Resend must have the sender
domain verified. Codes are kept only in server memory, expire after 10 minutes, can be used once,
and are rate-limited. No email address, OTP, or newsletter subscription is written to a database;
successful verification only confirms the address for that request. In-memory challenges are cleared
when the server restarts and are not shared across multiple server instances.
