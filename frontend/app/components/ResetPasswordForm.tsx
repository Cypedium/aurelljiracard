'use client';
import { useState } from "react";
import Link from "next/link";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { resetPassword } from "../api/endpoints";
import { apiErrorMessage, apiMessage } from "../utils/apiError";
import { RESET_LINK_INVALID_MESSAGE, resetPasswordSchema, type ResetPasswordValues } from "../utils/register";
import { ROUTES } from "../utils/routes";
import { AUTH_BUTTON_LINK_CLASS, AUTH_FORM_CLASS, AUTH_LINK_CLASS } from "../utils/styles";
import NewPasswordFields from "./NewPasswordFields";
import { Button } from "./ui/button";
import { Form } from "./ui/form";
import { useLanguage } from "../hooks/useLanguage";
import { msg } from "../utils/i18n";

type Status = { state: "form" } | { state: "done"; message: string } | { state: "invalid"; message: string };

// The page the reset email links to: a new password twice. The token is checked when the form is sent
export default function ResetPasswordForm({ token }: { token: string }) {
  const { t } = useLanguage();
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const [status, setStatus] = useState<Status>({ state: "form" });

  const handleReset = async ({ password }: ResetPasswordValues) => {
    try {
      const { data } = await resetPassword(token, password);
      setStatus({ state: "done", message: data.message });
    } catch (err) {
      const message = apiMessage(err);
      if (message === RESET_LINK_INVALID_MESSAGE) {
        setStatus({ state: "invalid", message });
      } else if (isAxiosError(err) && err.response?.status === 400 && message) {
        // A password rule the form doesn't know about (e.g. the byte length)
        form.setError("password", { message: apiErrorMessage(err, message) }, { shouldFocus: true });
      } else {
        toast.error(apiErrorMessage(err, msg("Could not change the password. Please try again.")));
      }
    }
  };

  if (status.state !== "form") {
    const done = status.state === "done";
    return (
      <div role="status" className={AUTH_FORM_CLASS}>
        <h2 className="text-xl font-semibold">{done ? t("Password changed") : t("The link does not work")}</h2>
        <p className="mt-3 text-jira-secondary">{t(status.message)}</p>
        {done && <p className="mt-2 text-xs text-jira-secondary">{t("You have been logged out on every device.")}</p>}
        <Link href={done ? ROUTES.login : ROUTES.forgotPassword} className={AUTH_BUTTON_LINK_CLASS}>
          {done ? t("Log in") : t("Get a new link")}
        </Link>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleReset)} className={AUTH_FORM_CLASS} noValidate>
        <h2 className="text-xl font-semibold">{t("Choose a new password")}</h2>

        <NewPasswordFields control={form.control} label="New password" />

        <Button type="submit" className="mt-6 w-full" disabled={form.formState.isSubmitting}>
          {t("Change password")}
        </Button>

        <Link href={ROUTES.login} className={AUTH_LINK_CLASS}>
          {t("Back to login")}
        </Link>
      </form>
    </Form>
  );
}
