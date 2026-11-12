'use client';
import LoginForm from "../components/LoginForm";
import Welcome from "../components/Welcome";

export default function LoginPage() {
  // Mobil: texten ovanför formuläret (pt-20 under den fasta navbaren). Desktop: bredvid
  return (
    <div className="flex min-h-[calc(100dvh-60px)] flex-col items-center justify-center gap-8 pt-20 pb-10 md:flex-row md:gap-16">
      <Welcome />
      <LoginForm />
    </div>
  );
}