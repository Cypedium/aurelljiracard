'use client';
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { joinBoard } from "../../api/endpoints";
import { showJoinedBoard } from "../../hooks/useBoards";
import { isServiceUnavailable, logError, reportError } from "../../utils/apiError";
import { PENDING_INVITE_KEY } from "../../utils/currentBoard";
import { hasSession } from "../../utils/session";
import { writeText } from "../../utils/storage";
import { ROUTES } from "../../utils/routes";
import { useLanguage } from "../../hooks/useLanguage";
import { boardName } from "../../utils/currentBoard";
import { msg } from "../../utils/i18n";
import { CENTERED_PAGE_CLASS } from "../../utils/styles";

type Status = "joining" | "login" | "failed" | "disabled";

// An invite link from the board's owner. Logged in: join and open the board.
// Otherwise the invite is kept until login (useBoards accepts it) and the user is sent to login
export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("joining");
  const { t } = useLanguage();
  // Strict mode runs the effect twice; join only once
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !token) return;
    started.current = true;
    if (!hasSession()) {
      writeText(PENDING_INVITE_KEY, token, "session");
      setStatus("login");
      return;
    }
    joinBoard(token)
      .then((res) => {
        showJoinedBoard(res.data);
        toast.success(t("You joined {board}.", { board: boardName(res.data, t) }));
        router.replace(ROUTES.board);
      })
      .catch((err) => {
        // joinBoard switched off or read-only: the link isn't broken, the page says so instead of a toast
        if (isServiceUnavailable(err)) {
          logError("Join board error", err);
          setStatus("disabled");
          return;
        }
        reportError("Join board error", err, msg("Could not join the board."));
        setStatus("failed");
      });
    // t only formats the toast: joining must not run again when the language changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, router]);

  return (
    <div className={CENTERED_PAGE_CLASS}>
      <div className="w-full max-w-[400px] rounded-lg bg-white p-6 text-center text-jira-text shadow-lg">
        {status === "joining" && <p className="text-sm text-jira-secondary">{t("Joining the board…")}</p>}
        {status === "login" && (
          <>
            <h1 className="text-lg font-semibold">{t("You are invited to a board")}</h1>
            <p className="mt-2 text-sm text-jira-secondary">{t("Log in or register, and you join the board automatically.")}</p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href={ROUTES.login} className="rounded-[3px] bg-jira-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-jira-primary-hover">
                {t("Log in")}
              </Link>
              <Link href={ROUTES.register} className="rounded-[3px] px-3 py-1.5 text-sm font-medium text-jira-primary hover:bg-jira-neutral">
                {t("Register")}
              </Link>
            </div>
          </>
        )}
        {status === "disabled" && (
          <>
            <h1 className="text-lg font-semibold">{t("Joining boards is temporarily disabled")}</h1>
            <p className="mt-2 text-sm text-jira-secondary">{t("The link still works. Open it again a little later.")}</p>
            <Link href={ROUTES.board} className="mt-4 inline-block text-sm font-medium text-jira-primary hover:underline">
              {t("Go to your board")}
            </Link>
          </>
        )}
        {status === "failed" && (
          <>
            <h1 className="text-lg font-semibold">{t("The link does not work")}</h1>
            <p className="mt-2 text-sm text-jira-secondary">{t("Ask the board's owner for a new invite link.")}</p>
            <Link href={ROUTES.board} className="mt-4 inline-block text-sm font-medium text-jira-primary hover:underline">
              {t("Go to your board")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
