import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { CommandCenter } from "./components/command-center";
import { DemoProvider } from "./contexts/DemoContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PortalContainerProvider } from "./contexts/PortalContainerContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PortalContainerProvider container={null}>
      <TooltipProvider>
        <ThemeProvider>
          <DemoProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<CommandCenter />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </DemoProvider>
        </ThemeProvider>
      </TooltipProvider>
    </PortalContainerProvider>
  </QueryClientProvider>
);

export default App;
