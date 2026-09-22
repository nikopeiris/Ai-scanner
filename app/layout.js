import "./globals.css";

export const metadata = {
  title: "AI App Tester - GitHub Repository Inspector",
  description: "Automated static analysis, bug detection, and code improvement scanner powered by AI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
