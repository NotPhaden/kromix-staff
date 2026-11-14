import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
 title: "KROMIX STAFF PANEL",
 description: "Platformă internă de administrare și comunicare pentru echipa Kromix.",
 icons: { icon: "/favicon.png", shortcut: "/favicon.png", apple: "/favicon.png" },
};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="ro"><body>{children}</body></html>;
}
