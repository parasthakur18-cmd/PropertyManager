import { useEffect, useState } from "react";
import { X, UtensilsCrossed, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PopupData {
  title?: string | null;
  message?: string | null;
  showOrderButton?: boolean;
  orderButtonText?: string | null;
  openingTime?: string | null;   // "HH:MM" 24h
  closingTime?: string | null;   // "HH:MM" 24h
  preOpeningMessage?: string | null;
}

interface RestaurantPopupProps {
  propertyId: number | string | null;
  onOrderNow?: () => void;
}

const SESSION_KEY = "rp_dismissed_";

/** Parse "HH:MM" into minutes since midnight */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Current local time in minutes since midnight */
function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** Format "HH:MM" (24h) to readable "8:00 AM" */
function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function RestaurantPopup({ propertyId, onOrderNow }: RestaurantPopupProps) {
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [mode, setMode] = useState<"regular" | "pre-opening" | null>(null);
  const [visible, setVisible] = useState(false);
  const [animOut, setAnimOut] = useState(false);
  const [waitMins, setWaitMins] = useState(0);
  const [openTimeLabel, setOpenTimeLabel] = useState("");

  useEffect(() => {
    if (!propertyId) return;
    const pid = String(propertyId);
    if (sessionStorage.getItem(SESSION_KEY + pid)) return;

    fetch(`/api/public/restaurant-popup/${pid}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: PopupData | null) => {
        if (!data) return;

        const openTime = data.openingTime || "08:00";
        const closeTime = data.closingTime || "22:00";
        const now = nowMinutes();
        const openMin = timeToMinutes(openTime);
        const closeMin = timeToMinutes(closeTime);

        const isBeforeOpen = now < openMin;
        const isAfterClose = now >= closeMin;

        if (isBeforeOpen) {
          // Show pre-opening popup
          const wait = openMin - now;
          setWaitMins(wait);
          setOpenTimeLabel(fmt12(openTime));
          setPopup(data);
          setMode("pre-opening");
          setTimeout(() => setVisible(true), 3500);
        } else if (!isAfterClose && data.message) {
          // Within hours — show regular popup
          setPopup(data);
          setMode("regular");
          setTimeout(() => setVisible(true), 3500);
        }
        // After close: no popup
      })
      .catch(() => {});
  }, [propertyId]);

  const dismiss = () => {
    setAnimOut(true);
    setTimeout(() => {
      setVisible(false);
      setAnimOut(false);
      setPopup(null);
      setMode(null);
      if (propertyId) sessionStorage.setItem(SESSION_KEY + String(propertyId), "1");
    }, 280);
  };

  const handleOrderNow = () => {
    dismiss();
    onOrderNow?.();
  };

  if (!visible || !popup || !mode) return null;

  // Build pre-opening message with substitutions
  const preOpenMsg = mode === "pre-opening"
    ? (popup.preOpeningMessage || "Kitchen opens at {{OPEN_TIME}}. Please wait for {{WAIT_TIME}} minutes.")
        .replace(/\{\{OPEN_TIME\}\}/g, openTimeLabel)
        .replace(/\{\{WAIT_TIME\}\}/g, String(waitMins))
    : "";

  const isPreOpening = mode === "pre-opening";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10, 20, 40, 0.72)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{
          animation: animOut
            ? "popupOut 0.28s cubic-bezier(0.4,0,1,1) forwards"
            : "popupIn 0.38s cubic-bezier(0.175,0.885,0.32,1.275) forwards",
        }}
      >
        <style>{`
          @keyframes popupIn {
            from { opacity: 0; transform: scale(0.88) translateY(20px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes popupOut {
            from { opacity: 1; transform: scale(1) translateY(0); }
            to   { opacity: 0; transform: scale(0.92) translateY(10px); }
          }
        `}</style>

        {/* Header band */}
        <div
          className="relative px-6 pt-8 pb-5 text-white"
          style={{
            background: isPreOpening
              ? "linear-gradient(135deg, #2d3748 0%, #4a5568 100%)"
              : "linear-gradient(135deg, #1E3A5F 0%, #2BB6A8 100%)",
          }}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
            style={{ background: "white", transform: "translate(30%,-40%)" }} />
          <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full opacity-10"
            style={{ background: "white", transform: "translate(-40%,40%)" }} />

          <div className="relative flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.18)" }}>
              {isPreOpening
                ? <Clock className="h-5 w-5 text-white" />
                : <UtensilsCrossed className="h-5 w-5 text-white" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg leading-tight">
                {isPreOpening ? "Kitchen Not Open Yet" : (popup.title || "Today's Update")}
              </h2>
              <p className="text-xs text-white/70 mt-0.5">
                {isPreOpening ? `Opens at ${openTimeLabel}` : "From the kitchen"}
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={dismiss}
            data-testid="btn-popup-close"
            className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.18)" }}
          >
            <X className="h-3.5 w-3.5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="bg-white dark:bg-zinc-900 px-6 py-5">
          <div
            className="w-10 h-1 rounded-full mb-4"
            style={{ background: isPreOpening ? "#6b7280" : "#F2B705" }}
          />

          {isPreOpening ? (
            <>
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {preOpenMsg}
              </p>
              {/* Wait time badge */}
              <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  {waitMins} minute{waitMins !== 1 ? "s" : ""} to go
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
              {popup.message}
            </p>
          )}

          <div className="flex gap-3 mt-5">
            {!isPreOpening && popup.showOrderButton && (
              <Button
                data-testid="btn-popup-order-now"
                className="flex-1 font-semibold"
                style={{ background: "linear-gradient(135deg, #1E3A5F, #2BB6A8)", border: "none", color: "white" }}
                onClick={handleOrderNow}
              >
                {popup.orderButtonText || "Order Now"}
              </Button>
            )}
            <Button
              data-testid="btn-popup-dismiss"
              variant="outline"
              className={(!isPreOpening && popup.showOrderButton) ? "px-4" : "flex-1"}
              onClick={dismiss}
            >
              {(!isPreOpening && popup.showOrderButton) ? "Close" : "Got it!"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
