import * as React from "react";

interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnlineAt: Date | null;
}

export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = React.useState(false);
  const [lastOnlineAt, setLastOnlineAt] = React.useState<Date | null>(null);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(new Date());
      if (!isOnline) {
        setWasOffline(true);
        // Reset wasOffline after 5 seconds
        setTimeout(() => setWasOffline(false), 5000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isOnline]);

  return { isOnline, wasOffline, lastOnlineAt };
}

interface ConnectionQuality {
  type: "slow" | "medium" | "fast" | "unknown";
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
}

export function useConnectionQuality(): ConnectionQuality {
  const [quality, setQuality] = React.useState<ConnectionQuality>({
    type: "unknown",
    effectiveType: null,
    downlink: null,
    rtt: null,
  });

  React.useEffect(() => {
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (!connection) return;

    const updateConnectionInfo = () => {
      const effectiveType = connection.effectiveType;
      let type: ConnectionQuality["type"] = "unknown";

      if (effectiveType === "slow-2g" || effectiveType === "2g") {
        type = "slow";
      } else if (effectiveType === "3g") {
        type = "medium";
      } else if (effectiveType === "4g") {
        type = "fast";
      }

      setQuality({
        type,
        effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      });
    };

    updateConnectionInfo();
    connection.addEventListener("change", updateConnectionInfo);

    return () => connection.removeEventListener("change", updateConnectionInfo);
  }, []);

  return quality;
}