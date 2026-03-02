import "./globals.css";

export const metadata = {
  title: "Proofpoint — Customer Success Intelligence",
  description: "AI-powered customer success platform for B2B SaaS teams",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
