function PageContainer({ children }) {
  return (
    <main className="min-h-screen bg-surface-bg px-0 py-0 transition-colors duration-300 sm:px-6">
      <section className="flex w-full flex-col gap-4">{children}</section>
    </main>
  )
}

export default PageContainer
