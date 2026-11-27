'use client';
import ForgotPasswordForm from "../components/ForgotPasswordForm";
import { CENTERED_PAGE_CLASS } from "../utils/styles";

// "Forgot password?" on the login form
export default function ForgotPasswordPage() {
  return (
    <div className={CENTERED_PAGE_CLASS}>
      <ForgotPasswordForm />
    </div>
  );
}
