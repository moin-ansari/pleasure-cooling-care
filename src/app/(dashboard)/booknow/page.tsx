import { redirect } from "next/navigation";

export default function BookNow() {
  redirect("/home#bookingForm");
}
