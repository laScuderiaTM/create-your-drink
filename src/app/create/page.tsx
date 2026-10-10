"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Wizard } from "@/components/Wizard";

function WizardFromUrl() {
  const params = useSearchParams();
  return <Wizard table={params.get("masa") ?? ""} kiosk={params.get("kiosk") === "1"} />;
}

export default function CreatePage() {
  return (
    <Suspense>
      <WizardFromUrl />
    </Suspense>
  );
}
