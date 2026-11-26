'use client';
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { forgotPassword } from "../api/endpoints";
import { apiErrorMessage } from "../utils/apiError";
import { emailSchema, type EmailValues } from "../utils/register";
import { ROUTES } from "../utils/routes";
import { AUTH_FORM_CLASS, AUTH_LINK_CLASS, FIELD_ERROR_CLASS, FORM_ITEM_CLASS, LABEL_CLASS } from "../utils/styles";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { useLanguage } from "../hooks/useLanguage";
import { msg } from "../utils/i18n";

// Asks for the account's email and sends a reset link. The answer is the same whether or not an account has
// the address, so the page always says "if an account has it"
export default function ForgotPasswordForm() {
  const { t, language } = useLanguage();
  const form = useForm<EmailValues>({ resolver: zodResolver(emailSchema), defaultValues: { email: "" } });
  // The backend's answer; the form is replaced by it
  const [sent, setSent] = useState<string | null>(null);

  const handleSubmit = async ({ email }: EmailValues) => {
    try {
      const { data } = await forgotPassword(email, language);
      setSent(data.message);
    } catch (err) {
      toast.error(apiErrorMessage(err, msg("Could not send the email. Please try again later.")));
    }
  };

  if (sent) {
    return (
      <div role="status" className={AUTH_FORM_CLASS}>
        <h2 className="text-xl font-semibold">{t("Check your email")}</h2>
        <p className="mt-3 text-jira-secondary">{t(sent)}</p>
        <p className="mt-2 text-xs text-jira-secondary">
          {t("The link works for 1 hour. No email? Check your spam folder, or try again in a minute.")}
        </p>
        <Link href={ROUTES.login} className={AUTH_LINK_CLASS}>
          {t("Back to login")}
        </Link>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={AUTH_FORM_CLASS} noValidate>
        <h2 className="text-xl font-semibold">{t("Forgot password")}</h2>
        <p className="mt-3 text-sm text-jira-secondary">
          {t("Enter the email address of your account and we'll send you a link to choose a new password.")}
        </p>

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

        <Button type="submit" className="mt-6 w-full" disabled={form.formState.isSubmitting}>
          {t("Send link")}
        </Button>

        <Link href={ROUTES.login} className={AUTH_LINK_CLASS}>
          {t("Back to login")}
        </Link>
      </form>
    </Form>
  );
}
