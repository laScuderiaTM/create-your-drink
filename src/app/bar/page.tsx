"use client";

import { BarDashboard } from "@/components/BarDashboard";
import { StaffGate } from "@/components/StaffGate";

export default function BarPage() {
  return (
    <StaffGate need="bar" title="Bar – login">
      <BarDashboard />
    </StaffGate>
  );
}
