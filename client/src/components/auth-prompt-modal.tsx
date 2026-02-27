import { Shield, X } from "lucide-react";

interface AuthPromptModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthPromptModal({ open, onClose }: AuthPromptModalProps) {
  if (!open) return null;

  return (
    <div
      data-testid="auth-prompt-overlay"
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        data-testid="auth-prompt-modal"
        className="w-full max-w-sm rounded-xl border border-[hsl(215,15%,16%)] shadow-2xl p-6"
        style={{ backgroundColor: "hsl(220,18%,7%)" }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[hsl(195,90%,48%)]" />
            <span className="text-sm font-mono font-semibold text-[hsl(195,90%,48%)]">Account Required</span>
          </div>
          <button
            data-testid="button-close-auth-prompt"
            onClick={onClose}
            className="p-1 text-[hsl(215,10%,48%)] hover:text-[hsl(200,15%,72%)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-[hsl(200,15%,72%)] mb-1">
          You need an anonymous account to save data.
        </p>
        <p className="text-xs text-[hsl(215,10%,48%)] mb-5">
          Your identity stays private — we only store a hashed ID, no personal information.
        </p>

        <a
          data-testid="button-login-auth-prompt"
          href="/api/login"
          className="block w-full py-2.5 rounded-lg text-sm font-semibold text-center transition-all duration-200"
          style={{ backgroundColor: "hsl(195, 90%, 48%)", color: "hsl(220, 25%, 5%)" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(195, 90%, 56%)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "hsl(195, 90%, 48%)")}
        >
          Login with Replit
        </a>
        <button
          data-testid="button-dismiss-auth-prompt"
          onClick={onClose}
          className="block w-full mt-2 py-2 text-xs text-[hsl(215,10%,48%)] hover:text-[hsl(200,15%,72%)] transition-colors"
        >
          Continue as Guest
        </button>
      </div>
    </div>
  );
}
