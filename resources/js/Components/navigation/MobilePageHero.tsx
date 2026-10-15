interface MobilePageHeroProps {
    title: string;
    description: string;
}

export default function MobilePageHero({
    title,
    description,
}: MobilePageHeroProps) {
    return (
        <section className="mobile-photo-copy relative flex min-h-[200px] shrink-0 flex-col justify-end overflow-hidden bg-[#8FCDF4] px-4 pb-10 pt-20 text-white md:hidden">
            <img
                src="/images/prima-banner.jpg"
                alt=""
                aria-hidden="true"
                width={1280}
                height={720}
                fetchPriority="high"
                className="absolute inset-0 size-full object-cover object-[center_35%]"
            />
            {/* Bottom shadow overlay — only shadows the bottom portion, leaving top photo bright */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#020b18]/90 via-[#051329]/50 to-transparent"
            />
            <div className="relative z-10">
                <h1 className="text-balance text-2xl font-extrabold leading-tight text-white">
                    {title}
                </h1>
                <p className="mt-1.5 max-w-sm text-pretty text-xs font-medium leading-relaxed text-white">
                    {description}
                </p>
            </div>
        </section>
    );
}
