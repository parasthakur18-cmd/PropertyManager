import { useEffect, useState } from "react";
import { X, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PopupData {
  title?: string | null;
  message?: string | null;
  showOrderButton?: boolean;
  orderButtonText?: string | null;
}

interface RestaurantPopupProps {
  propertyId: number | string | null;
  onOrderNow?: () => void;
}

const SESSION_KEY = "rp_dismissed_";

export function RestaurantPopup({ propertyId, onOrderNow }: RestaurantPopupProps) {
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [visible, setVisible] = useState(false);
  const [animOut, setAnimOut] = useState(false);

  useEffect(() => {
    if (!propertyId) return;
    const pid = String(propertyId);
    if (sessionStorage.getItem(SESSION_KEY + pid)) return;

    fetch(`/api/public/restaurant-popup/${pid}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.message) {
          setPopup(data);
          setTimeout(() => setVisible(true), 600);
        }
      })
      .catch(() => {});
  }, [propertyId]);

  const dismiss = () => {
    setAnimOut(true);
    setTimeout(() => {
      setVisible(false);
      setAnimOut(false);
      setPopup(null);
      if (propertyId) sessionStorage.setItem(SESSION_KEY + String(propertyId), "1");
    }, 280);
  };

  const handleOrderNow = () => {
    dismiss();
    onOrderNow?.();
  };

  if (!visible || !popup) return null;

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

        {/* Header band — brand gradient */}
        <div
          className="relative px-6 pt-8 pb-5 text-white"
          style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #2BB6A8 100%)" }}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
            style={{ background: "white", transform: "translate(30%,-40%)" }} />
          <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full opacity-10"
            style={{ background: "white", transform: "translate(-40%,40%)" }} />

          <div className="relative flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.18)" }}>
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              {popup.title ? (
                <h2 className="font-bold text-lg leading-tight">{popup.title}</h2>
              ) : (
                <h2 className="font-bold text-lg leading-tight">Today's Update 🍽️</h2>
              )}
              <p className="text-xs text-white/70 mt-0.5">From the kitchen</p>
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
          {/* Accent line */}
          <div className="w-10 h-1 rounded-full mb-4" style={{ background: "#F2B705" }} />

          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
            {popup.message}
          </p>

          <div className="flex gap-3 mt-5">
            {popup.showOrderButton && (
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
              className={popup.showOrderButton ? "px-4" : "flex-1"}
              onClick={dismiss}
            >
              {popup.showOrderButton ? "Close" : "Got it!"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
