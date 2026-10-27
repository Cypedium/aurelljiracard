'use client';
import { useState } from "react";
import { toast } from "sonner";
import { saveSession } from "../utils/session";
import { AUTH_FORM_CLASS, LABEL_CLASS } from "../utils/styles";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      saveSession(username, data.accessToken, data.refreshToken);

      window.location.href = "/cards";

    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred");
    }
  };

  return (
    <form onSubmit={handleLogin} className={AUTH_FORM_CLASS}>
      <h2 className="text-xl font-semibold">Login</h2>

      <Label className={LABEL_CLASS} htmlFor="login-username">
        Username
      </Label>
      <Input
        id="login-username"
        type="text"
        autoComplete="username"
        className="bg-white"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />

      <Label className={LABEL_CLASS} htmlFor="login-password">
        Password
      </Label>
      <Input
        id="login-password"
        type="password"
        autoComplete="current-password"
        className="bg-white"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <Button type="submit" className="mt-6 w-full">
        Login
      </Button>
    </form>
  );
}