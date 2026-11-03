import { useState } from "react";
import { Check, Copy } from "lucide-react";

// The temporary password is only ever shown here, once, right after it is generated.
export function CredentialNotice({
  email,
  password,
  onClose,
}: {
  email: string;
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(`Email: ${email}\nTemporary password: ${password}`);
    setCopied(true);
  };
  return (
    <div className="credential-notice" role="status">
      <strong>Temporary password for {email}</strong>
      <code>{password}</code>
      <p>
        Share it securely. It is shown only once and the user must set a new password at first
        sign-in.
      </p>
      <div className="credential-actions">
        <button type="button" className="partner-link" onClick={() => void copy()}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
        </button>
        <button type="button" className="partner-link" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
