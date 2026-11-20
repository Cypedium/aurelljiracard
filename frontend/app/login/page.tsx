'use client';
import LoginForm from "../components/LoginForm";
import Welcome from "../components/Welcome";

export default function LoginPage() {
  // Mobile and tablet: the text above the form (pt-20 below the fixed navbar). Large screen (lg): next to it
  return (
    <div className="flex min-h-[calc(100dvh-60px)] flex-col items-center justify-center gap-6 pt-20 pb-10 sm:gap-8 lg:flex-row lg:gap-16">
      <Welcome />
      <LoginForm />
    </div>
  );
}