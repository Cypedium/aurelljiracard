'use client';
import { useParams } from "next/navigation";
import ResetPasswordForm from "../../components/ResetPasswordForm";
import { CENTERED_PAGE_CLASS } from "../../utils/styles";

// The link in the password reset email (/reset-password/<token>)
export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  return (
    <div className={CENTERED_PAGE_CLASS}>
      <ResetPasswordForm token={token} />
    </div>
  );
}
