import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { SiteLayout } from "./layouts/SiteLayout";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/ContactPage";
import { FaqPage } from "./pages/FaqPage";
import { HomePage } from "./pages/HomePage";
import { LicensingPage } from "./pages/LicensingPage";

const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "hakkimizda", element: <AboutPage /> },
      { path: "lisanslama", element: <LicensingPage /> },
      { path: "sss", element: <FaqPage /> },
      { path: "iletisim", element: <ContactPage /> }
    ]
  }
]);

export function App() {
  return <RouterProvider router={router} />;
}
