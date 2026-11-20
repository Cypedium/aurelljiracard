'use client';
import FeatureOff from "../components/FeatureOff";
import RegisterForm from "../components/RegisterForm";
import { useFeatures } from "../hooks/useFeatures";
import Welcome from "../components/Welcome";

export default function RegisterPage() {
  // The register switch (or read-only): the backend refuses new users with 503
  const { isOn } = useFeatures();
  // Mobile and tablet: the text above the form (pt-20 below the fixed navbar). Large screen (lg): next to it
  return (
    <div className="flex min-h-[calc(100dvh-60px)] flex-col items-center justify-center gap-6 pt-20 pb-10 sm:gap-8 lg:flex-row lg:gap-16">
      <Welcome />
      {isOn("register") ? (
        <RegisterForm />
      ) : (
        <FeatureOff
          title="Registration is closed for now"
          text="New accounts can't be created at the moment. Please try again later."
          showBoardLink={false}
        />
      )}
    </div>
  );
}