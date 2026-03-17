import { redirect } from "next/navigation";

/**
 * Root route — immediately redirects to the login page.
 * Once session management is in place, this should check for a valid
 * session cookie and redirect to /dashboard when authenticated.
 */
export default function RootPage(): never {
  redirect("/login");
}
