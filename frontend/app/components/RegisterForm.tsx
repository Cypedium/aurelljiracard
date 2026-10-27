'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import checkPasswordStrength from "../utils/checkPasswordStrength";
import { registerUser } from "../api/endpoints";
import { readAsDataUrl, validateRegistration } from "../utils/register";
import { AUTH_FORM_CLASS, LABEL_CLASS } from "../utils/styles";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [strength, setStrength] = useState("");
  const [pictureFile, setPictureFile] = useState<File | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const invalid = validateRegistration(username, password, pictureFile);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError("");

    try {
      const pictureUrl = pictureFile ? await readAsDataUrl(pictureFile) : "";

      const res = await registerUser({ username, password, pictureUrl });

      // Toastern ligger i layouten, så den syns kvar på /login
      toast.success(res.data.message);
      router.push("/login");
    } catch (err) {
      const message = isAxiosError(err) ? err.response?.data?.message : null;
      setError(message || "Registration failed. Please try again.");
    }
  };

  return (
    <form onSubmit={handleRegister} className={AUTH_FORM_CLASS}>
      <h2 className="text-xl font-semibold">Register</h2>

      {error && (
        <p role="alert" className="mt-4 rounded-[3px] bg-jira-info px-3 py-2 text-jira-danger">
          {error}
        </p>
      )}

      <Label className={LABEL_CLASS} htmlFor="register-picture">
        Profile picture
      </Label>
      <Input
        id="register-picture"
        type="file"
        accept="image/*"
        className="bg-white"
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          setPictureFile(file);
        }}
      />

      <Label className={LABEL_CLASS} htmlFor="register-username">
        Username
      </Label>
      <Input
        id="register-username"
        type="text"
        autoComplete="username"
        className="bg-white"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <Label className={LABEL_CLASS} htmlFor="register-password">
        Password
      </Label>
      <Input
        id="register-password"
        type="password"
        autoComplete="new-password"
        className="bg-white"
        value={password}
        onChange={(e) => {
          const pwd = e.target.value;
          setPassword(pwd);
          setStrength(checkPasswordStrength(pwd));
        }}
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

      <Button type="submit" className="mt-6 w-full">
        Register
      </Button>
    </form>
  );
}
