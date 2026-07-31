"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import IdleTimeoutDialog from "@/components/IdleTimeoutDialog";

function clearAuthStorage() {
  try {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
  } catch {
    /* ignore */
  }
}

export default function IdleTimeoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleSignOut = useCallback(() => {
    clearAuthStorage();
    router.replace("/sign-in");
  }, [router]);

  const { isWarning, remainingSeconds, continueSession, signOutNow } =
    useIdleTimeout({ onSignOut: handleSignOut, enabled: true });

  return (
    <>
      {children}
      <IdleTimeoutDialog
        isOpen={isWarning}
        remainingSeconds={remainingSeconds}
        onContinue={continueSession}
        onCancel={signOutNow}
      />
    </>
  );
}
