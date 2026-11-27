'use client';
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { verifyEmail } from "../../api/endpoints";
import { apiErrorMessage, logError } from "../../utils/apiError";
import { ROUTES } from "../../utils/routes";
import { useLanguage } from "../../hooks/useLanguage";
import { msg } from "../../utils/i18n";
import { CENTERED_PAGE_CLASS } from "../../utils/styles";

type Status = { state: "verifying" } | { state: "done" } | { state: "failed"; message: string };

// The link in the verification email: posts the token, then sends the user to login
export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useLanguage();
  const [status, setStatus] = useState<Status>({ state: "verifying" });
  // Strict mode runs the effect twice; a link works only once
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !token) return;
    started.current = true;
    verifyEmail(token)
      .then(() => setStatus({ state: "done" }))
      .catch((err) => {
        logError("Verify email error", err);
        setStatus({ state: "failed", message: apiErrorMessage(err, msg("Could not verify your email. Please try again.")) });
      });
  }, [token]);

  return (
    <div className={CENTERED_PAGE_CLASS}>
      <div role="status" className="w-full max-w-[400px] rounded-lg bg-white p-6 text-center text-jira-text shadow-lg">
        {status.state === "verifying" && <p className="text-sm text-jira-secondary">{t("Verifying your email…")}</p>}
        {status.state === "done" && (
          <>
            <h1 className="text-lg font-semibold">{t("Your email is verified")}</h1>
            <p className="mt-2 text-sm text-jira-secondary">{t("You can log in now.")}</p>
          </>
        )}
        {status.state === "failed" && (
          <>
            <h1 className="text-lg font-semibold">{t("The link does not work")}</h1>
            <p className="mt-2 text-sm text-jira-secondary">{status.message}</p>
            <p className="mt-2 text-sm text-jira-secondary">{t("Log in to get a new link.")}</p>
          </>
        )}
        {status.state !== "verifying" && (
          <Link
            href={ROUTES.login}
            className="mt-4 inline-block rounded-[3px] bg-jira-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-jira-primary-hover"
          >
            {t("Log in")}
          </Link>
        )}
      </div>
    </div>
  );
}
