export function LiveSessionBackdrop({ coverUrl }: { coverUrl: string | null }) {
    if (!coverUrl) {
        return null;
    }

    return (
        <img
            src={coverUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 left-16 h-175 w-190 rounded-full object-cover opacity-30 blur-[130px]"
        />
    );
}
