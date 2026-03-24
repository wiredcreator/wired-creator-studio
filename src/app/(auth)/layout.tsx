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
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-white/90 shadow-md">
              <svg className="h-4.5 w-4.5 text-[#2683EB]" viewBox="0 0 24 24" fill="currentColor">
                <path d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-[#1a3a5c]">
              studio
            </span>
          </div>
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
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[#4A90D9]">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
              Wired Studio
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
