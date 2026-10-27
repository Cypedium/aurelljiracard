'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import checkPasswordStrength from "../utils/checkPasswordStrength";
import { registerUser } from "../api/endpoints";
import { readAsDataUrl, validateRegistration } from "../utils/register";

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
    <form onSubmit={handleRegister} className="max-w-md mx-auto p-4 border rounded">
      <h2 className="text-xl font-semibold mb-4">Register</h2>

      {error && <p className="text-red-600 mb-2">{error}</p>}

      <label className="block mb-2 font-medium">Profile Picture</label>
      <input
        type="file"
        accept="image/*"
        className="mb-4"
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          setPictureFile(file);
        }}
      />

      <input
        type="text"
        placeholder="Username"
        className="w-full p-2 mb-3 border"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full p-2 mb-4 border"
        value={password}
        onChange={(e) => {
          const pwd = e.target.value;
          setPassword(pwd);
          setStrength(checkPasswordStrength(pwd));
        }}
      />

      {password && (
        <p
          className={`mb-2 font-semibold ${
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

      <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded">
        Register
      </button>
    </form>
  );
}
