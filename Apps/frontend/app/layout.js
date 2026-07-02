export const metadata = {
  title: "AI Mentor OS",
  description: "Generic scaffold frontend",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
