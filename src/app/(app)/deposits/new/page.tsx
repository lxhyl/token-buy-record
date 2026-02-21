import { redirect } from "next/navigation";

// Deposits are now created through the unified transaction form
export default function NewDepositPage() {
  redirect("/transactions/new?type=deposit");
}
