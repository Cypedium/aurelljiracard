'use client';
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { googleLogin, loginUser, type Credentials } from "../api/endpoints";
import { apiErrorMessage, apiMessage } from "../utils/apiError";
import { GOOGLE_CLIENT_ID } from "../utils/google";
import { saveSession, tokenUsername } from "../utils/session";
import { EMAIL_MISSING_MESSAGE, EMAIL_NOT_VERIFIED_MESSAGE, loginSchema, type LoginValues } from "../utils/register";
import EmailVerificationPrompt from "./EmailVerificationPrompt";
import { AUTH_FORM_CLASS, FIELD_ERROR_CLASS, FORM_ITEM_CLASS, LABEL_CLASS } from "../utils/styles";
import GoogleButton from "./GoogleButton";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { ROUTES } from "../utils/routes";
import { useLanguage } from '../hooks/useLanguage';
import { msg } from '../utils/i18n';

export default function LoginForm() {
  const { t } = useLanguage();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  // Set while the account's email isn't verified: the prompt replaces the form
  const [unverified, setUnverified] = useState<{ credentials: Credentials; needsEmail: boolean } | null>(null);

  const handleLogin = async ({ username, password }: LoginValues) => {
    try {
      const { data } = await loginUser({ username, password });
      // Login ignores case and accepts the email; save the name as the backend has it, otherwise the cards don't match
      saveSession(tokenUsername(data.accessToken) ?? username, data.accessToken, data.refreshToken);
      window.location.href = ROUTES.board;
    } catch (error) {
      const message = apiMessage(error);
      if (message === EMAIL_MISSING_MESSAGE || message === EMAIL_NOT_VERIFIED_MESSAGE) {
        setUnverified({ credentials: { username, password }, needsEmail: message === EMAIL_MISSING_MESSAGE });
        return;
      }
      // The backend's message (e.g. 401 "Invalid credentials."), otherwise we didn't reach the server
      toast.error(apiErrorMessage(error, msg("Could not reach the server. Please try again.")));
    }
  };

  if (unverified) {
    return <EmailVerificationPrompt {...unverified} onBack={() => setUnverified(null)} />;
  }

  // The first Google sign-in creates the user; the name is in the access token
  const handleGoogleLogin = async (credential: string) => {
    try {
      const { data } = await googleLogin(credential);
      saveSession(tokenUsername(data.accessToken) ?? "", data.accessToken, data.refreshToken);
      window.location.href = ROUTES.board;
    } catch (error) {
      toast.error(apiErrorMessage(error, msg("Could not sign in with Google. Please try again.")));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleLogin)} className={AUTH_FORM_CLASS} noValidate>
        <h2 className="text-xl font-semibold">{t("Login")}</h2>

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem className={FORM_ITEM_CLASS}>
              <FormLabel className={LABEL_CLASS}>{t("Username or email")}</FormLabel>
              <FormControl>
                <Input type="text" autoComplete="username" className="bg-white" {...field} />
              </FormControl>
              <FormMessage className={FIELD_ERROR_CLASS} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className={FORM_ITEM_CLASS}>
              <FormLabel className={LABEL_CLASS}>{t("Password")}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" className="bg-white" {...field} />
              </FormControl>
              <FormMessage className={FIELD_ERROR_CLASS} />
            </FormItem>
          )}
        />

        <Link href={ROUTES.forgotPassword} className="mt-2 self-end text-xs font-medium text-jira-primary hover:underline">
          {t("Forgot password?")}
        </Link>

        <Button type="submit" className="mt-4 w-full" disabled={form.formState.isSubmitting}>
          {t("Login")}
        </Button>

        {GOOGLE_CLIENT_ID && (
          <>
            <div className="my-4 flex items-center gap-3 text-xs text-jira-subtle" aria-hidden>
              <span className="h-px flex-1 bg-jira-neutral" />
              or
              <span className="h-px flex-1 bg-jira-neutral" />
            </div>
            <GoogleButton onCredential={handleGoogleLogin} />
          </>
        )}
      </form>
    </Form>
  );
}
