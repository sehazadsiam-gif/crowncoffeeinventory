const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ["pdf-parse"],
    },
    webpack: (config) => {
        config.module.rules.push({
            resourceQuery: /raw/,
            type: "asset/source",
        });

        config.module.rules.push({
            test: /\.html$/,
            resourceQuery: { not: [/raw/] },
            type: "asset/source",
        });

        return config;
    },
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    {
                        key: "X-DNS-Prefetch-Control",
                        value: "on",
                    },
                    {
                        key: "Strict-Transport-Security",
                        value: "max-age=63072000; includeSubDomains; preload",
                    },
                    {
                        key: "X-Frame-Options",
                        value: "SAMEORIGIN",
                    },
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(self), geolocation=(self), microphone=()",
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;