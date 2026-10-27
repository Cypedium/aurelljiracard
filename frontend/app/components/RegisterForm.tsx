'use client';
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import checkPasswordStrength from "../utils/checkPasswordStrength";
import { registerUser } from "../api/endpoints";
import { apiErrorMessage } from "../utils/apiError";
import { readAsDataUrl, registerSchema, type RegisterValues } from "../utils/register";
import { AUTH_FORM_CLASS, FIELD_ERROR_CLASS, FORM_ITEM_CLASS, LABEL_CLASS } from "../utils/styles";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";

export default function RegisterForm() {
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

      // Toastern ligger i layouten, så den syns kvar på /login
      toast.success(res.data.message);
      router.push("/login");
    } catch (err) {
      // T.ex. 409 "Username already taken."
      toast.error(apiErrorMessage(err, "Registration failed. Please try again."));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleRegister)} className={AUTH_FORM_CLASS} noValidate>
        <h2 className="text-xl font-semibold">Register</h2>

        <FormField
          control={form.control}
          name="picture"
          render={({ field: { name, onBlur, onChange, ref } }) => (
            <FormItem className={FORM_ITEM_CLASS}>
              <FormLabel className={LABEL_CLASS}>Profile picture</FormLabel>
              <FormControl>
                {/* Filfält kan inte styras med value, bara läsas vid onChange */}
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
              <FormLabel className={LABEL_CLASS}>Username</FormLabel>
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
              <FormLabel className={LABEL_CLASS}>Password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" className="bg-white" {...field} />
              </FormControl>
              <FormMessage className={FIELD_ERROR_CLASS} />
            </FormItem>
          )}
        />

        {password && (
          <p
            className={`mt-2 text-xs font-semibold ${
              strength === "Strong"
                ? "text-green-600"
                : strength === "Medium"
                ? "text-yellow-600"
                : "text-red-600"
            }`}
          >
            Password strength: {strength}
          </p>
        )}

        <Button type="submit" className="mt-6 w-full" disabled={form.formState.isSubmitting}>
          Register
        </Button>
      </form>
    </Form>
  );
}
