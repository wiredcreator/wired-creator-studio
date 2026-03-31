import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      {/* Left panel — sky gradient with clouds */}
      <div className="hidden lg:flex lg:w-[45%] lg:max-w-[520px] flex-col justify-between relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #EEF1F7 0%, #B8DEF0 35%, #6CC7E5 60%, #2683EB 100%)' }}
      >
        {/* Logo at top */}
        <div className="relative z-10 p-10">
          <Image src="/logo.png" alt="Wired Creator Studio" width={140} height={38} style={{ objectFit: 'contain' }} priority />
        </div>

        {/* Wired Creator text at bottom, above clouds */}
        <div className="relative z-10 p-10 pb-44">
          <h2 className="text-5xl font-bold leading-[1.1] text-[#1a3a5c]">
            Wired<br />Creator
          </h2>
        </div>

        {/* Cloud images along the bottom */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[40%]">
          <Image
            src="/images/clouds/left.png"
            alt=""
            width={679}
            height={371}
            className="absolute bottom-0 -left-6 w-[50%] object-contain object-bottom"
            priority
          />
          <Image
            src="/images/clouds/center.png"
            alt=""
            width={899}
            height={153}
            className="absolute bottom-4 left-1/2 w-[65%] -translate-x-1/2 object-contain object-bottom"
            priority
          />
          <Image
            src="/images/clouds/right.png"
            alt=""
            width={960}
            height={371}
            className="absolute bottom-0 -right-6 w-[55%] object-contain object-bottom"
            priority
          />
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-6" style={{ backgroundColor: '#FFFFFF', position: 'relative' }}>
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="mb-10 lg:hidden">
            <Image src="/logo.png" alt="Wired Creator Studio" width={130} height={34} style={{ objectFit: 'contain' }} priority />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
