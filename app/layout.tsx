import "@fontsource/poppins/300.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import Footer from './components/Footer';
import { AuthProvider } from '@/lib/AuthContext';

export const metadata = {
  title: "AlexListens - Demo",
  description: "Sometimes you just need someone to talk to.",
  icons: {
    icon: 'https://storage.googleapis.com/msgsndr/JBLl8rdfV29DRcGjQ7Rl/media/67fe14cfc7a015d190da94a0.png',
    shortcut: 'https://storage.googleapis.com/msgsndr/JBLl8rdfV29DRcGjQ7Rl/media/67fe14cfc7a015d190da94a0.png',
    apple: 'https://storage.googleapis.com/msgsndr/JBLl8rdfV29DRcGjQ7Rl/media/67fe14cfc7a015d190da94a0.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-white">
      <head>
        <script src="https://cdn.usefathom.com/script.js" data-site="ONYOCTXK" defer></script>
      </head>
      <body className="min-h-screen flex flex-col bg-white text-gray-900 font-poppins">
        <AuthProvider>
          <Toaster position="top-right" />
          <Header />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}