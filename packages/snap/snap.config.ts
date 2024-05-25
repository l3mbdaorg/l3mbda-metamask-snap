import { resolve } from 'path'
import type { SnapConfig } from '@metamask/snaps-cli'
import * as dotenv from 'dotenv'
dotenv.config()

const config: SnapConfig = {
    bundler: 'webpack',
    input: resolve(__dirname, 'src/index.tsx'),
    server: {
        port: 8080,
    },
    polyfills: {
        buffer: true,
    },
    environment: {
        API_HOST: process.env.API_HOST,
    },
}

export default config
