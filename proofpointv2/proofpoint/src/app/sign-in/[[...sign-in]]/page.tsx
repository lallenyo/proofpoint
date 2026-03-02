import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div style={{
      minHeight: "100vh", background: "#020817",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <SignIn />
    </div>
  );
}
