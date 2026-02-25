import AppLayout from "@/components/app-layout/app-layout";

const AuthedLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <AppLayout>
      {children}
    </AppLayout>
  )
}

export default AuthedLayout;