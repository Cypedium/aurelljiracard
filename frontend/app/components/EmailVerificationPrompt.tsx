'use client';
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { requestVerificationEmail, type Credentials } from "../api/endpoints";
import { apiErrorMessage, apiMessage, isConflictError } from "../utils/apiError";
import { EMAIL_TAKEN_MESSAGE, emailSchema, type EmailValues } from "../utils/register";
import { AUTH_FORM_CLASS, FIELD_ERROR_CLASS, FORM_ITEM_CLASS, LABEL_CLASS } from "../utils/styles";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { useLanguage } from "../hooks/useLanguage";
import { msg } from "../utils/i18n";

const SEND_FAILED = msg("Could not send the email. Please try again later.");

// Shown instead of the login form while the account's email isn't verified (login answered 403).
// needsEmail: an older account without an address; otherwise a new link, optionally to another address
export default function EmailVerificationPrompt({
  credentials,
  needsEmail,
  onBack,
}: {
  credentials: Credentials;
  needsEmail: boolean;
  onBack: () => void;
}) {
  const { t } = useLanguage();
  const [askForEmail, setAskForEmail] = useState(needsEmail);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const form = useForm<EmailValues>({ resolver: zodResolver(emailSchema), defaultValues: { email: "" } });

  const send = async (email?: string) => {
    setSending(true);
    try {
      const { data } = await requestVerificationEmail({ ...credentials, email });
      toast.success(t(data.message));
      setSent(true);
      setAskForEmail(false);
    } catch (err) {
      if (email && isConflictError(err) && apiMessage(err) === EMAIL_TAKEN_MESSAGE) {
        form.setError("email", { message: apiErrorMessage(err, SEND_FAILED) }, { shouldFocus: true });
      } else {
        toast.error(apiErrorMessage(err, SEND_FAILED));
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div role="status" className={AUTH_FORM_CLASS}>
      <h2 className="text-xl font-semibold">{needsEmail ? t("Add your email address") : t("Verify your email")}</h2>
      <p className="mt-3 text-jira-secondary">
        {sent
          ? t("We sent a new link. Open it to verify your address, then log in.")
          : needsEmail
            ? t("Every account now needs a verified email address. Enter yours and we'll send you a link.")
            : t("Open the link we sent to your email address, then log in again.")}
      </p>

      {askForEmail ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(({ email }) => send(email))} className="mt-2" noValidate>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className={FORM_ITEM_CLASS}>
                  <FormLabel className={LABEL_CLASS}>{t("Email")}</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" className="bg-white" {...field} />
                  </FormControl>
                  <FormMessage className={FIELD_ERROR_CLASS} />
                </FormItem>
              )}
            />
            <Button type="submit" className="mt-6 w-full" disabled={sending}>
              {t("Send link")}
            </Button>
          </form>
        </Form>
      ) : (
        <>
          <Button className="mt-6 w-full" disabled={sending} onClick={() => send()}>
            {t("Send a new link")}
          </Button>
          <button
            type="button"
            className="mt-3 self-center text-sm font-medium text-jira-primary hover:underline"
            onClick={() => setAskForEmail(true)}
          >
            {t("Use another email address")}
          </button>
        </>
      )}

      <button type="button" className="mt-4 self-center text-sm text-jira-secondary hover:underline" onClick={onBack}>
        {t("Back to login")}
      </button>
    </div>
  );
}
