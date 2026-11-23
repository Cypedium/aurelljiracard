'use client';
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import checkPasswordStrength from "../utils/checkPasswordStrength";
import { registerUser } from "../api/endpoints";
import { apiErrorMessage, isConflictError } from "../utils/apiError";
import { USERNAME_TAKEN_MESSAGE } from "../utils/username";
import { readAsDataUrl, registerSchema, type RegisterValues } from "../utils/register";
import { AUTH_FORM_CLASS, FIELD_ERROR_CLASS, FORM_ITEM_CLASS, LABEL_CLASS, PASSWORD_STRENGTH_CLASS } from "../utils/styles";
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
    defaultValues: { username: "", password: "", picture: null },
  });
  const password = form.watch("password");
  const strength = checkPasswordStrength(password);

  const handleRegister = async ({ username, password, picture }: RegisterValues) => {
    try {
      const pictureUrl = picture ? await readAsDataUrl(picture) : "";

      const res = await registerUser({ username, password, pictureUrl });

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
          name="picture"
          render={({ field: { name, onBlur, onChange, ref } }) => (
            <FormItem className={FORM_ITEM_CLASS}>
              <FormLabel className={LABEL_CLASS}>{t("Profile picture")}</FormLabel>
              <FormControl>
                {/* File inputs can't be controlled with value, only read in onChange */}
                <Input
                  type="file"
                  accept="image/*"
                  className="bg-white"
                  name={name}
                  ref={ref}
                  onBlur={onBlur}
                  onChange={(e) => onChange(e.target.files?.[0] ?? null)}
                />
              </FormControl>
              <FormMessage className={FIELD_ERROR_CLASS} />
            </FormItem>
          )}
        />

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
              <FormControl>
                <Input type="password" autoComplete="new-password" className="bg-white" {...field} />
              </FormControl>
              <FormMessage className={FIELD_ERROR_CLASS} />
            </FormItem>
          )}
        />

        {password && (
          <p className={`mt-2 text-xs font-semibold ${PASSWORD_STRENGTH_CLASS[strength]}`}>
            {t("Password strength: {strength}", { strength: t(strength) })}
          </p>
        )}

        <Button type="submit" className="mt-6 w-full" disabled={form.formState.isSubmitting}>
          {t("Register")}
        </Button>
      </form>
    </Form>
  );
}
