'use client';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { loginUser } from "../api/endpoints";
import { apiErrorMessage } from "../utils/apiError";
import { saveSession } from "../utils/session";
import { loginSchema, type LoginValues } from "../utils/register";
import { AUTH_FORM_CLASS, FIELD_ERROR_CLASS, FORM_ITEM_CLASS, LABEL_CLASS } from "../utils/styles";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";

export default function LoginForm() {
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const handleLogin = async ({ username, password }: LoginValues) => {
    try {
      const { data } = await loginUser({ username, password });
      saveSession(username, data.accessToken, data.refreshToken);
      window.location.href = "/cards";
    } catch (error) {
      // Backendens meddelande (t.ex. 401 "Invalid credentials."), annars nådde vi inte servern
      toast.error(apiErrorMessage(error, "Could not reach the server. Please try again."));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleLogin)} className={AUTH_FORM_CLASS} noValidate>
        <h2 className="text-xl font-semibold">Login</h2>

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
                <Input type="password" autoComplete="current-password" className="bg-white" {...field} />
              </FormControl>
              <FormMessage className={FIELD_ERROR_CLASS} />
            </FormItem>
          )}
        />

        <Button type="submit" className="mt-6 w-full" disabled={form.formState.isSubmitting}>
          Login
        </Button>
      </form>
    </Form>
  );
}
