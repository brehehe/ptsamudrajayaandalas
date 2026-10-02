interface MobilePageHeroProps {
    title: string;
    description: string;
}

export default function MobilePageHero({
    title,
    description,
}: MobilePageHeroProps) {
    return (
        <section className="relative flex min-h-[200px] shrink-0 flex-col justify-end overflow-hidden px-4 pb-10 pt-20 text-white md:hidden">
            <img
                src="/images/prima-banner.jpg"
                alt=""
                aria-hidden="true"
                width={1280}
                height={720}
                fetchPriority="high"
                className="absolute inset-0 size-full object-cover object-[center_35%]"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#001433]/90 via-[#001433]/70 to-[#001433]/95" />

            <div className="relative z-10">
                <h1 className="text-balance text-2xl font-extrabold leading-tight text-white drop-shadow-sm">
                    {title}
                </h1>
                <p className="mt-1.5 max-w-sm text-pretty text-xs leading-relaxed text-white/85">
                    {description}
                </p>
            </div>
        </section>
    );
}
