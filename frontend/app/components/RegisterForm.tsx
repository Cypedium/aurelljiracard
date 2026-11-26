'use client';
import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/16/solid";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import checkPasswordStrength from "../utils/checkPasswordStrength";
import { registerUser } from "../api/endpoints";
import { apiErrorMessage, isConflictError } from "../utils/apiError";
import { USERNAME_TAKEN_MESSAGE } from "../utils/username";
import { registerSchema, type RegisterValues } from "../utils/register";
import { AUTH_FORM_CLASS, FIELD_ERROR_CLASS, FORM_ITEM_CLASS, LABEL_CLASS, PASSWORD_STRENGTH_CLASS, PASSWORD_TOGGLE_CLASS } from "../utils/styles";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { ROUTES } from "../utils/routes";
import { useLanguage } from '../hooks/useLanguage';
import { msg } from '../utils/i18n';

export default function RegisterForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", password: "", confirmPassword: "" },
  });
  const password = form.watch("password");
  const strength = checkPasswordStrength(password);
  const [showPassword, setShowPassword] = useState(false);
  const passwordType = showPassword ? "text" : "password";
  const toggleLabel = showPassword ? t("Hide password") : t("Show password");

  const handleRegister = async ({ username, password }: RegisterValues) => {
    try {
      const res = await registerUser({ username, password });

      // The toaster is in the layout, so it stays visible on /login
      toast.success(t(res.data.message));
      router.push(ROUTES.login);
    } catch (err) {
      // A taken name (409, also with different case: "mike" when "Mike" exists) is shown under the field, like the issue key
      if (isConflictError(err)) {
        form.setError("username", { message: apiErrorMessage(err, USERNAME_TAKEN_MESSAGE) }, { shouldFocus: true });
        return;
      }
      toast.error(apiErrorMessage(err, msg("Registration failed. Please try again.")));
    }
  };

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
