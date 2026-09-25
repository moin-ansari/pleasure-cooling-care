import UserHeader from "@/components/custom/userHeader";

export default function Dashboard({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <div>
      <UserHeader />
      {children}
    </div>
  );
}
