import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/language";
import { ThemeProvider } from "@/lib/theme";
import { Navbar } from "@/components/navbar";
import { BottomNav } from "@/components/bottom-nav";
import HomePage from "@/pages/home";
import SearchPage from "@/pages/search";
import WatchPage from "@/pages/watch";
import MyListPage from "@/pages/my-list";
import AdminLoginPage from "@/pages/admin-login";
import AdminDashboardPage from "@/pages/admin-dashboard";
import SettingsPage from "@/pages/settings";
import LiveTvPage from "@/pages/live-tv";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function AppShell() {
  return (
    <div className="min-h-screen bg-black dark:bg-black">
      <Navbar />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/search" component={SearchPage} />
        <Route path="/watch/:id" component={WatchPage} />
        <Route path="/list" component={MyListPage} />
        <Route path="/live" component={LiveTvPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/admin" component={AdminLoginPage} />
        <Route path="/admin/dashboard" component={AdminDashboardPage} />
        <Route component={NotFound} />
      </Switch>
      <BottomNav />
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <LanguageProvider>
            <WouterRouter>
              <AppShell />
            </WouterRouter>
          </LanguageProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
