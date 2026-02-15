import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";
import 'dotenv/config';

// Safer env handling
const arcjetKey = process.env.ARCJET_KEY;
const arcjetMode = 'LIVE';

if (!arcjetKey) {
    console.error("❌ ARCJET_KEY missing");
    process.exit(1);
}

console.log("🔐 Arcjet Mode:", arcjetMode);
console.log("🔐 Arcjet Enabled:", !!arcjetKey);

// 🔥 VERY STRICT for testing
// Change back later
const httpRules = [
    // shield({ mode: arcjetMode }),
    // detectBot({
    //     mode: arcjetMode,
    //     allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW']
    // }),
    slidingWindow({
        mode: 'LIVE',
        interval: '10s',
        max: 1,
        // characteristics: ["ip"]   // 🔥 Track per IP
        characteristics: ["clientId"]   // 👈 custom name
    })
];

export const httpArcjet = arcjet({
    key: arcjetKey,
    rules: httpRules,
});

export const wsArcjet = arcjet({
    key: arcjetKey,
    rules: [
        // shield({ mode: arcjetMode }),
        // detectBot({
        //     mode: arcjetMode,
        //     allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW']
        // }),
        slidingWindow({
            mode: arcjetMode,
            interval: '2s',
            max: 3,
            // characteristics: ["ip"]
            characteristics: ["clientId"]   // 👈 custom name
        })
    ],
});

export function securityMiddleware() {
    return async (req, res, next) => {
        try {

            let clientIp =
                req.headers['x-forwarded-for'] ||
                req.socket?.remoteAddress ||
                "127.0.0.1";

            // If the IP is the IPv6 loopback, normalize it to IPv4 for easier testing
            if (clientIp === "::1") {
                clientIp = "127.0.0.1";
            }

            console.log("Detected IP:", clientIp);

            // ... inside securityMiddleware ...
            const decision = await httpArcjet.protect(req, {
                // Pass the IP explicitly so internal rules (shield/detectBot) can find it
                ip: clientIp,
                // Pass the clientId for your custom slidingWindow rule
                clientId: clientIp
            });

            console.log("Arcjet Decision:", {
                denied: decision.isDenied(),
                reason: decision.reason?.type
            });

            if (decision.isDenied()) {
                if (decision.reason?.isRateLimit()) {
                    return res.status(429).json({
                        error: "Too many requests."
                    });
                }

                return res.status(403).json({
                    error: "Forbidden."
                });
            }

            next();
        } catch (err) {
            console.error("Arcjet error:", err);
            return res.status(503).json({
                error: "Service Unavailable"
            });
        }
    };
}

