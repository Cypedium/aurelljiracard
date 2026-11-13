'use client';
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { joinBoard } from "../../api/endpoints";
import { showJoinedBoard } from "../../cards/useBoards";
import { reportError } from "../../utils/apiError";
import { PENDING_INVITE_KEY } from "../../utils/currentBoard";
import { hasSession } from "../../utils/session";

type Status = "joining" | "login" | "failed";

// En inbjudningslänk från boardens ägare. Inloggad: gå med och öppna boarden.
// Annars sparas inbjudan tills inloggningen (useBoards tar emot den) och användaren skickas till login
export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("joining");
  // Strict mode kör effekten två gånger; gå med en gång
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !token) return;
    started.current = true;
    if (!hasSession()) {
      sessionStorage.setItem(PENDING_INVITE_KEY, token);
      setStatus("login");
      return;
    }
    joinBoard(token)
      .then((res) => {
        showJoinedBoard(res.data);
        toast.success(`You joined ${res.data.name}.`);
        router.replace("/cards");
      })
      .catch((err) => {
        reportError("Join board error", err, "Could not join the board.");
        setStatus("failed");
      });
  }, [token, router]);

  return (
    <div className="flex min-h-[calc(100dvh-60px)] items-center justify-center bg-linear-135 from-board-from via-board-via to-board-to px-4 pt-20 font-jira">
      <div className="w-full max-w-[400px] rounded-lg bg-white p-6 text-center text-jira-text shadow-lg">
        {status === "joining" && <p className="text-sm text-jira-secondary">Joining the board…</p>}
        {status === "login" && (
          <>
            <h1 className="text-lg font-semibold">You are invited to a board</h1>
            <p className="mt-2 text-sm text-jira-secondary">Log in or register, and you join the board automatically.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/login" className="rounded-[3px] bg-jira-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-jira-primary-hover">
                Log in
              </Link>
              <Link href="/register" className="rounded-[3px] px-3 py-1.5 text-sm font-medium text-jira-primary hover:bg-jira-neutral">
                Register
              </Link>
            </div>
          </>
        )}
        {status === "failed" && (
          <>
            <h1 className="text-lg font-semibold">The link does not work</h1>
            <p className="mt-2 text-sm text-jira-secondary">Ask the board&apos;s owner for a new invite link.</p>
            <Link href="/cards" className="mt-4 inline-block text-sm font-medium text-jira-primary hover:underline">
              Go to your board
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
