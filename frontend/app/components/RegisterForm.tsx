'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { registerUser } from "../api/endpoints";
import { apiErrorMessage, apiMessage, isConflictError } from "../utils/apiError";
import { USERNAME_TAKEN_MESSAGE } from "../utils/username";
import { EMAIL_TAKEN_MESSAGE, registerSchema, type RegisterValues } from "../utils/register";
import { AUTH_FORM_CLASS, FIELD_ERROR_CLASS, FORM_ITEM_CLASS, LABEL_CLASS } from "../utils/styles";
import NewPasswordFields from "./NewPasswordFields";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { ROUTES } from "../utils/routes";
import { useLanguage } from '../hooks/useLanguage';
import { msg } from '../utils/i18n';

export default function RegisterForm() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  });
  // The address the verification link was sent to; the form is replaced by "check your email"
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleRegister = async ({ username, email, password }: RegisterValues) => {
    try {
      await registerUser({ username, email, password, language });
      setSentTo(email);
    } catch (err) {
      // A taken name (409, also with different case: "mike" when "Mike" exists) or a verified address is shown under its field
      if (isConflictError(err)) {
        const field = apiMessage(err) === EMAIL_TAKEN_MESSAGE ? "email" : "username";
        form.setError(field, { message: apiErrorMessage(err, USERNAME_TAKEN_MESSAGE) }, { shouldFocus: true });
        return;
      }
      toast.error(apiErrorMessage(err, msg("Registration failed. Please try again.")));
    }
  };

  if (sentTo) {
    return (
      <div role="status" className={AUTH_FORM_CLASS}>
        <h2 className="text-xl font-semibold">{t("Check your email")}</h2>
        <p className="mt-3 text-jira-secondary">
          {t("We sent a link to {email}. Open it to verify your address, then log in.", { email: sentTo })}
        </p>
        <p className="mt-2 text-xs text-jira-secondary">
          {t("No email? Check your spam folder, or log in to get a new link.")}
        </p>
        <Button className="mt-6 w-full" onClick={() => router.push(ROUTES.login)}>
          {t("Go to login")}
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleRegister)} className={AUTH_FORM_CLASS} noValidate>
        <h2 className="text-xl font-semibold">{t("Register")}</h2>

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem className={FORM_ITEM_CLASS}>
              <FormLabel className={LABEL_CLASS}>{t("Username")}</FormLabel>
              <FormControl>
                <Input type="text" autoComplete="username" className="bg-white" {...field} />
              </FormControl>
              <FormMessage className={FIELD_ERROR_CLASS} />
            </FormItem>
          )}
        />

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

        <NewPasswordFields control={form.control} />

        <Button type="submit" className="mt-6 w-full" disabled={form.formState.isSubmitting}>
          {t("Register")}
        </Button>
      </form>
    </Form>
  );
}
