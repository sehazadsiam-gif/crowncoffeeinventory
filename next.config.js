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
};

module.exports = nextConfig;