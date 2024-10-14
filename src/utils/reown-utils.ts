import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { mainnet } from '@reown/appkit/networks';
import { createAppKit } from '@reown/appkit/react';

const projectId = '14981993a49025275134d3a1c154b3ae';


const metadata = {
    name: 'GhostLand',
    description: 'An interactive demo',
    url: 'https://mini-app-3af.pages.dev/', // origin must match your domain & subdomain
    icons: ['https://assets.reown.com/reown-profile-pic.png']
}

export function initAppKit() {
    createAppKit({
        adapters: [new EthersAdapter()],
        networks: [mainnet],
        metadata,
        projectId,
        features: {
            email: true,
            socials: [],
            analytics: true // Optional - defaults to your Cloud configuration
        }
    })
}