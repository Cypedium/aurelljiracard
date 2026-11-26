'use client';
import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/16/solid";
import { useWatch, type Control } from "react-hook-form";
import checkPasswordStrength from "../utils/checkPasswordStrength";
import { FIELD_ERROR_CLASS, FORM_ITEM_CLASS, LABEL_CLASS, PASSWORD_STRENGTH_CLASS, PASSWORD_TOGGLE_CLASS } from "../utils/styles";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { useLanguage } from "../hooks/useLanguage";

type NewPasswordValues = { password: string; confirmPassword: string };

// A new password, its strength and the confirmation (register, reset password). The form's schema checks them
export default function NewPasswordFields<T extends NewPasswordValues>({
  control,
  label = "Password",
}: {
  control: Control<T>;
  label?: "Password" | "New password";
}) {
  const { t } = useLanguage();
  // The fields are only named "password" and "confirmPassword", whatever else the form has
  const fields = control as unknown as Control<NewPasswordValues>;
  const password = useWatch({ control: fields, name: "password" });
  const strength = checkPasswordStrength(password);
  const [showPassword, setShowPassword] = useState(false);
  const passwordType = showPassword ? "text" : "password";
  const toggleLabel = showPassword ? t("Hide password") : t("Show password");

  return (
    <>
      <FormField
        control={fields}
        name="password"
        render={({ field }) => (
          <FormItem className={FORM_ITEM_CLASS}>
            <FormLabel className={LABEL_CLASS}>{label === "Password" ? t("Password") : t("New password")}</FormLabel>
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
        control={fields}
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
    </>
  );
}
