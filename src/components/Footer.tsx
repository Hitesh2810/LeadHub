const Footer = () => {
  return (
    <footer className="border-t bg-card px-4 py-3 text-center text-xs text-muted-foreground md:px-6">
      LeadHub © {new Date().getFullYear()} — Smart Lead Management System
    </footer>
  );
};

export default Footer;
