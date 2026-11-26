'use client';
import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/16/solid";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import checkPasswordStrength from "../utils/checkPasswordStrength";
import { registerUser } from "../api/endpoints";
import { apiErrorMessage, apiMessage, isConflictError } from "../utils/apiError";
import { USERNAME_TAKEN_MESSAGE } from "../utils/username";
import { EMAIL_TAKEN_MESSAGE, registerSchema, type RegisterValues } from "../utils/register";
import { AUTH_FORM_CLASS, FIELD_ERROR_CLASS, FORM_ITEM_CLASS, LABEL_CLASS, PASSWORD_STRENGTH_CLASS, PASSWORD_TOGGLE_CLASS } from "../utils/styles";
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
  const password = form.watch("password");
  const strength = checkPasswordStrength(password);
  const [showPassword, setShowPassword] = useState(false);
  const passwordType = showPassword ? "text" : "password";
  const toggleLabel = showPassword ? t("Hide password") : t("Show password");

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

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className={FORM_ITEM_CLASS}>
              <FormLabel className={LABEL_CLASS}>{t("Password")}</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input type={passwordType} autoComplete="new-password" className="bg-white pr-9" {...field} />
                </FormControl>
                {/* Shows or hides both password fields */}
                <button
                  type="button"
                  className={PASSWORD_TOGGLE_CLASS}
                  onClick={() => setShowPassword((show) => !show)}
                  aria-label={toggleLabel}
                  aria-pressed={showPassword}
                  title={toggleLabel}
                >
                  {showPassword ? <EyeSlashIcon className="size-4" aria-hidden /> : <EyeIcon className="size-4" aria-hidden />}
                </button>
              </div>
              <FormMessage className={FIELD_ERROR_CLASS} />
            </FormItem>
          )}
        />

        {password && (
          <p className={`mt-2 text-xs font-semibold ${PASSWORD_STRENGTH_CLASS[strength]}`}>
            {t("Password strength: {strength}", { strength: t(strength) })}
          </p>
        )}

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem className={FORM_ITEM_CLASS}>
              <FormLabel className={LABEL_CLASS}>{t("Confirm password")}</FormLabel>
              <FormControl>
                <Input type={passwordType} autoComplete="new-password" className="bg-white" {...field} />
              </FormControl>
              <FormMessage className={FIELD_ERROR_CLASS} />
            </FormItem>
          )}
        />

        <Button type="submit" className="mt-6 w-full" disabled={form.formState.isSubmitting}>
          {t("Register")}
        </Button>
      </form>
    </Form>
  );
}
