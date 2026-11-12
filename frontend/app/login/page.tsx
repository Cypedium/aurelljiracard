'use client';
import LoginForm from "../components/LoginForm";
import Welcome from "../components/Welcome";

export default function LoginPage() {
  // Mobil och surfplatta: texten ovanför formuläret (pt-20 under den fasta navbaren). Stor skärm (lg): bredvid
  return (
    <div className="flex min-h-[calc(100dvh-60px)] flex-col items-center justify-center gap-6 pt-20 pb-10 sm:gap-8 lg:flex-row lg:gap-16">
      <Welcome />
      <LoginForm />
    </div>
  );
}