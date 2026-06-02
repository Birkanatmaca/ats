import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { SiteLayout } from "./layouts/SiteLayout";
import { SolutionPageLayout } from "./components/SolutionPageLayout";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/ContactPage";
import { FaqPage } from "./pages/FaqPage";
import { HomePage } from "./pages/HomePage";
import { LicensingPage } from "./pages/LicensingPage";
import { SolutionsHubPage } from "./pages/SolutionsHubPage";
import { solutionPages } from "./lib/solution-pages";

const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "hakkimizda", element: <AboutPage /> },
      { path: "lisanslama", element: <LicensingPage /> },
      { path: "sss", element: <FaqPage /> },
      { path: "iletisim", element: <ContactPage /> },
      { path: "cozumler", element: <SolutionsHubPage /> },
      ...solutionPages.map((page) => ({
        path: page.path.replace(/^\//, ""),
        element: <SolutionPageLayout config={page} />
      }))
    ]
  }
]);

export function App() {
  return <RouterProvider router={router} />;
}
