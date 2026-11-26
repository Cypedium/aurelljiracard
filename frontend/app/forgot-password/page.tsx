'use client';
import ForgotPasswordForm from "../components/ForgotPasswordForm";

// "Forgot password?" on the login form
export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[calc(100dvh-60px)] items-center justify-center px-4 pt-20 pb-10">
      <ForgotPasswordForm />
    </div>
  );
}
