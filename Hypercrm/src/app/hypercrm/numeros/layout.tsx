import MainLayout from "@/components/layout/MainLayout";

export default function NumerosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
