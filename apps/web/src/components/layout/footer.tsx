export function Footer() {
  return (
    <footer className="h-10 border-t bg-card flex items-center justify-between px-6 text-xs text-muted-foreground">
      <span>Shopify Admin Dashboard v0.1.0</span>
      <span>© {new Date().getFullYear()} — All rights reserved</span>
    </footer>
  );
}
