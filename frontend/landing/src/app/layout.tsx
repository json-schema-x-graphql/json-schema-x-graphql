import { Footer, Layout, Navbar } from 'nextra-theme-docs'

import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'
import "@/styles/globals.css"

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      
      <body>
        <Layout
          navbar={<Navbar logo={<b>Petrified Forest</b>} />}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/JJediny/json-schema-x-graphql"
          footer={<Footer>MIT © Petrified Forest</Footer>}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
