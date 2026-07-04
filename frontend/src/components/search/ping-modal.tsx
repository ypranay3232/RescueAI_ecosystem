"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, CheckCircle2, Radio, Phone, MapPin, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmergencyService } from "@/components/maps/rescue-map";

// ─── types ────────────────────────────────────────────────────────────────────

type SendState = "idle" | "sending" | "success" | "error";

interface PingModalProps {
  service: EmergencyService | null;
  crashLat?: number;
  crashLng?: number;
  onClose: () => void;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const SERVICE_LABELS: Record<string, string> = {
  hospital:     "Medical Emergency Team",
  police:       "Police Dispatch",
  fire_station: "Fire & Rescue Dispatch",
};

const SERVICE_COLORS: Record<string, string> = {
  hospital:     "#ec4899",
  police:       "#3b82f6",
  fire_station: "#f97316",
};

const SERVICE_EMOJIS: Record<string, string> = {
  hospital:     "🏥",
  police:       "🚔",
  fire_station: "🚒",
};

function buildMessage(svc: EmergencyService, crashLat?: number, crashLng?: number): string {
  const coordLine =
    crashLat != null && crashLng != null
      ? `\nCrash coordinates: ${crashLat.toFixed(5)}, ${crashLng.toFixed(5)}`
      : "";
  const etaLine =
    svc.etaMinutes != null
      ? `\nEstimated road distance: ${svc.roadDistanceKm?.toFixed(1)} km · ETA: ${svc.etaMinutes} min`
      : "";
  const mapsLink =
    crashLat != null && crashLng != null
      ? `\nhttps://www.google.com/maps?q=${crashLat.toFixed(5)},${crashLng.toFixed(5)}`
      : "";

  return (
    `EMERGENCY ALERT — Aircraft Signal Lost / Crash Incident` +
    `\n${"─".repeat(42)}` +
    `\nRecipient: ${svc.name}` +
    `${coordLine}` +
    `${etaLine}` +
    `\nSituation: Aircraft has lost signal and may have crashed. ` +
    `Immediate search and rescue support requested.` +
    `\nPlease dispatch nearest available units to the crash site.` +
    `${mapsLink}` +
    `\n${"─".repeat(42)}` +
    `\nSent via RescueOS AI · ${new Date().toLocaleString()}`
  );
}

// ─── sending steps (shown sequentially during demo send) ─────────────────────

const SEND_STEPS = [
  { label: "Encrypting alert payload…",        pct: 15  },
  { label: "Connecting to emergency network…", pct: 35  },
  { label: "Authenticating sender identity…",  pct: 55  },
  { label: "Transmitting to dispatch center…", pct: 78  },
  { label: "Awaiting acknowledgement…",        pct: 92  },
  { label: "Alert delivered successfully.",    pct: 100 },
];

// ─── component ────────────────────────────────────────────────────────────────

export function PingModal({ service, crashLat, crashLng, onClose }: PingModalProps) {
  const [message, setMessage]     = useState("");
  const [sendState, setSendState] = useState<SendState>("idle");
  const [stepIdx, setStepIdx]     = useState(0);
  const [progress, setProgress]   = useState(0);
  const [sentAt, setSentAt]       = useState<string | null>(null);
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rebuild pre-filled message whenever the target changes
  useEffect(() => {
    if (!service) return;
    setMessage(buildMessage(service, crashLat, crashLng));
    setSendState("idle");
    setStepIdx(0);
    setProgress(0);
    setSentAt(null);
  }, [service, crashLat, crashLng]);

  // Cleanup on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const handleSend = () => {
    if (sendState !== "idle") return;
    setSendState("sending");
    setStepIdx(0);
    setProgress(0);

    let step = 0;
    intervalRef.current = setInterval(() => {
      step += 1;
      setStepIdx(step);
      setProgress(SEND_STEPS[Math.min(step, SEND_STEPS.length - 1)].pct);

      if (step >= SEND_STEPS.length - 1) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setSentAt(new Date().toLocaleTimeString());
        setSendState("success");
      }
    }, 520);
  };

  const handleClose = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onClose();
  };

  if (!service) return null;

  const accentColor = SERVICE_COLORS[service.type] ?? "#6366f1";
  const emoji       = SERVICE_EMOJIS[service.type] ?? "🆘";
  const label       = SERVICE_LABELS[service.type] ?? "Emergency Dispatch";

  return (
    <AnimatePresence>
      {service && (
        /* Backdrop */
        <motion.div
          key="ping-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,.72)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          {/* Panel */}
          <motion.div
            key="ping-panel"
            initial={{ scale: 0.88, opacity: 0, y: 24 }}
            animate={{ scale: 1,    opacity: 1, y: 0  }}
            exit={{   scale: 0.92, opacity: 0, y: 12  }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="relative w-full max-w-lg rounded-2xl border border-border/60 bg-background shadow-2xl overflow-hidden"
          >
            {/* Coloured top accent bar */}
            <div
              className="h-1 w-full"
              style={{ background: `linear-gradient(90deg, ${accentColor}cc, ${accentColor}44)` }}
            />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-xl flex-shrink-0"
                  style={{ background: `${accentColor}18`, border: `1.5px solid ${accentColor}55` }}
                >
                  {emoji}
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">{service.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: accentColor }}>{label}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 px-6 pb-4 text-xs text-muted-foreground">
              {service.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3" />
                  <a href={`tel:${service.phone}`} className="text-blue-400 hover:underline">
                    {service.phone}
                  </a>
                </span>
              )}
              {service.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" /> {service.address}
                </span>
              )}
              {service.etaMinutes != null && (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Clock className="h-3 w-3" />
                  {service.roadDistanceKm?.toFixed(1)} km · ETA {service.etaMinutes} min
                </span>
              )}
            </div>

            {/* Message editor / success state */}
            <div className="px-6 pb-2">
              {sendState !== "success" ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Alert message
                    <span className="ml-2 text-yellow-500/80 text-[10px]">
                      ⚠ DEMO — no real message will be sent
                    </span>
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5
                               text-xs font-mono leading-relaxed resize-none focus:outline-none
                               focus:ring-1 focus:ring-border/80 text-foreground"
                    rows={9}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={sendState === "sending"}
                  />
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-4 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm text-emerald-400">Alert Delivered</p>
                      <p className="text-xs text-muted-foreground">Sent at {sentAt}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>✓ Message transmitted to {service.name}</p>
                    <p>✓ Dispatch notified of crash coordinates</p>
                    <p>✓ Reference ID: {`RSC-${Date.now().toString(36).toUpperCase()}`}</p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Progress bar + step label during send */}
            <AnimatePresence>
              {sendState === "sending" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-6 pb-3"
                >
                  <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
                      <span>{SEND_STEPS[Math.min(stepIdx, SEND_STEPS.length - 1)].label}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: accentColor }}
                        initial={{ width: "0%" }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Disclaimer */}
            <div className="px-6 pb-3">
              <div className="flex items-start gap-2 rounded-lg bg-yellow-500/8 border border-yellow-500/20 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-yellow-400/80 leading-snug">
                  This is a demo feature. In a real deployment this would connect to
                  emergency dispatch systems via authenticated API. No real alert is sent.
                </p>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex gap-3 px-6 pb-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClose}
              >
                {sendState === "success" ? "Close" : "Cancel"}
              </Button>

              {sendState !== "success" && (
                <motion.div className="flex-1" whileTap={{ scale: 0.96 }}>
                  <Button
                    className="w-full font-semibold gap-2"
                    style={{
                      background: sendState === "sending"
                        ? undefined
                        : `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`,
                    }}
                    disabled={sendState === "sending"}
                    onClick={handleSend}
                  >
                    {sendState === "sending" ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                    ) : (
                      <><Radio className="h-4 w-4" /><Send className="h-3.5 w-3.5" /> Send Alert</>
                    )}
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
