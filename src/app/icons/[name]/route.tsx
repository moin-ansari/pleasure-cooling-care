import { ImageResponse } from "next/og";

// Home-screen icons, drawn on demand so no image files are needed. "maskable" leaves extra room around the
// snowflake because phones crop that kind of icon into a circle or rounded square.
const SIZES: Record<string, { size: number; pad: number }> = {
    "192": { size: 192, pad: 0.16 },
    "512": { size: 512, pad: 0.16 },
    "maskable-512": { size: 512, pad: 0.3 },
};

export async function GET(_request: Request, { params }: { params: { name: string } }) {
    const spec = SIZES[params.name];
    if (!spec) return new Response("Not found", { status: 404 });

    const { size, pad } = spec;
    const inner = size * (1 - pad * 2);
    const c = 50;
    const arms = [0, 60, 120].map((deg) => {
        const r = (deg * Math.PI) / 180;
        return { x1: c - 40 * Math.cos(r), y1: c - 40 * Math.sin(r), x2: c + 40 * Math.cos(r), y2: c + 40 * Math.sin(r) };
    });

    return new ImageResponse(
        (
            <div style={{ width: size, height: size, background: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width={inner} height={inner} viewBox="0 0 100 100" fill="none" stroke="#ffffff" strokeWidth="7" strokeLinecap="round">
                    {arms.map((a, i) => (
                        <line key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} />
                    ))}
                    <circle cx="50" cy="50" r="7" fill="#ffffff" />
                </svg>
            </div>
        ),
        { width: size, height: size }
    );
}
