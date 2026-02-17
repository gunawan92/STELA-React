function PageContainer({ children }) {
  return (
    <main className="min-h-screen bg-surface-bg px-4 py-4 transition-colors duration-300 sm:px-6">
      <section className="flex w-full flex-col gap-4">
        {children}
      </section>
    </main>
  );
}

export default PageContainer;
