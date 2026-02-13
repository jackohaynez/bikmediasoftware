import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black">
      <div className="mb-8">
        <Image
          src="/logo.webp"
          alt="BIK Media"
          width={200}
          height={60}
          className="h-12 w-auto"
          priority
        />
      </div>
      {children}
    </div>
  );
}
