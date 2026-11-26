'use client';
import { useParams } from "next/navigation";
import ResetPasswordForm from "../../components/ResetPasswordForm";

// The link in the password reset email (/reset-password/<token>)
export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  return (
    <div className="flex min-h-[calc(100dvh-60px)] items-center justify-center px-4 pt-20 pb-10">
      <ResetPasswordForm token={token} />
    </div>
  );
}
