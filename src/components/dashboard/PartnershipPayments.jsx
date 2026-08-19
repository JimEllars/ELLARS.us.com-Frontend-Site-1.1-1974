import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Safe, { SafeFactory } from '@safe-global/protocol-kit';
import { useAppStore } from '@/store/useAppStore';
import { saveToAximCore } from '@/lib/api';

const ARBITRUM_CHAIN_ID = '0xa4b1';

const PartnershipPayments = () => {
  const { walletConnected, setWalletConnected, showToast, treasuryAddress, setTreasuryAddress } = useAppStore();
  const [account, setAccount] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [networkError, setNetworkError] = useState('');
  const [balance, setBalance] = useState(null);
  const [balanceError, setBalanceError] = useState(false);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);

  const fetchBalance = async (address) => {
    setIsFetchingBalance(true);
    setBalanceError(false);
    try {
      const provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');

      const balancePromise = provider.getBalance(address);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('RPC Timeout')), 5000)
      );

      const rawBalance = await Promise.race([balancePromise, timeoutPromise]);
      setBalance(ethers.formatEther(rawBalance));
    } catch (err) {
      console.error('Failed to fetch treasury balance:', err);
      setBalanceError(true);
    } finally {
      setIsFetchingBalance(false);
    }
  };

  useEffect(() => {
    if (treasuryAddress) {
      fetchBalance(treasuryAddress);
    }
  }, [treasuryAddress]);


  useEffect(() => {
    // Check if wallet was already connected on load
    const checkConnection = async () => {
      if (window.ethereum && walletConnected) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            checkNetwork();
          } else {
            setWalletConnected(false);
          }
        } catch (err) {
          console.error('Failed to get eth_accounts', err);
        }
      }
    };

    checkConnection();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setWalletConnected(true);
        } else {
          setAccount(null);
          setWalletConnected(false);
        }
      });

      window.ethereum.on('chainChanged', (chainId) => {
         if (chainId !== ARBITRUM_CHAIN_ID) {
            setNetworkError('Please switch to Arbitrum One to execute transactions.');
         } else {
            setNetworkError('');
         }
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, [setWalletConnected, walletConnected]);

  const checkNetwork = async () => {
    if (!window.ethereum) return;
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== ARBITRUM_CHAIN_ID) {
      setNetworkError('Please switch to Arbitrum One to execute transactions.');
    } else {
      setNetworkError('');
    }
  };

  const switchNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARBITRUM_CHAIN_ID }],
      });
      setNetworkError('');
      showToast('Successfully switched to Arbitrum One.');
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: ARBITRUM_CHAIN_ID,
                chainName: 'Arbitrum One',
                rpcUrls: ['https://arb1.arbitrum.io/rpc'],
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18,
                },
                blockExplorerUrls: ['https://arbiscan.io/'],
              },
            ],
          });
          setNetworkError('');
          showToast('Arbitrum One network added and active.');
        } catch (addError) {
           console.error('Failed to add Arbitrum network', addError);
           setNetworkError('Failed to add Arbitrum network. Please add it manually.');
        }
      } else {
         console.error('Failed to switch network', switchError);
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      showToast('MetaMask is not installed. Please install it to use this feature.');
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setWalletConnected(true);
      await checkNetwork();
      showToast('Wallet connected securely.');
    } catch (err) {
      console.error('Connection failed:', err);
      if (err.code === 4001) {
         showToast('Wallet connection rejected by user.');
      } else {
         showToast('Failed to connect wallet.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const deploySafeVault = async () => {
    if (!account) return;
    setIsDeploying(true);

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Configure SafeFactory
      const safeFactory = await SafeFactory.create({ ethAdapter: signer });

      const safeAccountConfig = {
        owners: [account],
        threshold: 1,
      };

      showToast('Deploying Multisig Treasury Vault. Please confirm in MetaMask...');

      // Deploy the Safe
      const safeSdk = await safeFactory.deploySafe({ safeAccountConfig });
      const newSafeAddress = await safeSdk.getAddress();

      setTreasuryAddress(newSafeAddress);

      // Log deployment back to AXiM Core
      await saveToAximCore({
        type: 'treasury_deployment',
        contract_address: newSafeAddress,
        network: 'Arbitrum One',
        deployed_by: account,
        timestamp: new Date().toISOString()
      });

      showToast('Treasury Vault deployed successfully!');

    } catch (err) {
      console.error('Failed to deploy Safe Vault:', err);
      showToast('Treasury deployment failed. Verify Arbitrum ETH balance for gas.');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="deco-frame p-8 bg-black/40 backdrop-blur-md w-full min-h-[600px] border border-white/10 rounded-sm">
      <div className="mb-8">
        <h2 className="font-editorial font-black text-3xl tracking-tighter text-white uppercase mb-2 flex items-center">
          Partnership <span className="text-yellow-electric ml-2">Payments</span>
        </h2>
        <div className="h-px w-16 bg-yellow-electric/50 mb-4"></div>
        <p className="font-mono text-sm text-gray-400 uppercase tracking-widest text-xs">
          Deploy and execute secure, decentralized treasury operations.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-12 border border-white/5 bg-void/30 rounded-sm">
         {!account ? (
           <>
              <div className="w-16 h-16 mb-6 rounded-full border border-yellow-electric/20 flex items-center justify-center bg-yellow-electric/5">
                <svg className="w-8 h-8 text-yellow-electric" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="font-editorial font-bold text-xl text-white mb-2 uppercase tracking-widest">Connect Gateway</h3>
              <p className="font-mono text-xs text-gray-500 mb-8 max-w-sm text-center tracking-widest uppercase">
                 Connect your Web3 provider to interact with the Arbitrum One Multisig Treasury Vault.
              </p>
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="px-8 py-4 bg-yellow-electric text-black font-editorial font-bold text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:bg-yellow-400 transition-colors hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? 'Authenticating...' : 'Connect MetaMask'}
              </button>
           </>
         ) : (
           <div className="w-full px-8 flex flex-col items-start">
             <div className="flex items-center justify-between w-full mb-8 pb-4 border-b border-white/10">
                <div>
                   <h3 className="font-editorial font-bold text-lg text-white uppercase tracking-widest">Gateway Active</h3>
                   <p className="font-mono text-xs text-green-400 tracking-widest">{account.slice(0, 6)}...{account.slice(-4)}</p>
                </div>
                <div className="flex items-center space-x-2">
                   <div className={`w-2 h-2 rounded-full ${networkError ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></div>
                   <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">
                     {networkError ? 'Wrong Network' : 'Arbitrum One'}
                   </span>
                </div>
             </div>

             {networkError ? (
                <div className="w-full flex flex-col items-center justify-center py-8">
                  <p className="text-red-400 font-mono text-xs mb-6 uppercase tracking-widest">{networkError}</p>
                  <button
                    onClick={switchNetwork}
                    className="px-6 py-3 border border-yellow-electric/30 text-yellow-electric text-xs tracking-widest uppercase hover:bg-yellow-electric/10 transition-colors"
                  >
                    Switch to Arbitrum One
                  </button>
                </div>
             ) : treasuryAddress ? (
                <div className="w-full flex flex-col items-center justify-center py-8">
                   <div className="w-16 h-16 mb-4 rounded-full border border-green-500/50 bg-green-500/10 flex items-center justify-center">
                     <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                   </div>
                   <h4 className="font-editorial font-bold text-white text-xl uppercase tracking-widest mb-2">APF Treasury Active</h4>
                   <p className="font-mono text-xs text-gray-400 tracking-widest uppercase mb-4">Vault Address:</p>
                   <div className="px-4 py-2 bg-black/50 border border-white/10 rounded-sm font-mono text-xs text-yellow-electric break-all mb-8 text-center max-w-sm">
                     {treasuryAddress}
                   </div>

                   <div className="w-full max-w-sm deco-frame p-6 bg-black/60 backdrop-blur-md flex flex-col items-center">
                      <p className="font-mono text-[10px] text-gray-500 tracking-widest uppercase mb-2">Network Holdings</p>
                      {isFetchingBalance ? (
                         <div className="flex items-center space-x-2">
                           <div className="w-4 h-4 border-2 border-yellow-electric/20 border-t-yellow-electric rounded-full animate-spin"></div>
                           <span className="font-mono text-xs text-yellow-electric tracking-widest uppercase">Syncing On-Chain...</span>
                         </div>
                      ) : balanceError ? (
                         <div className="flex flex-col items-center">
                           <span className="font-mono text-xs text-red-400 tracking-widest uppercase mb-3">RPC Connection Timeout</span>
                           <button
                             onClick={() => fetchBalance(treasuryAddress)}
                             className="px-4 py-2 border border-yellow-electric/30 text-yellow-electric text-[10px] tracking-widest uppercase hover:bg-yellow-electric/10 transition-colors"
                           >
                             Retry Sync
                           </button>
                         </div>
                      ) : (
                         <div className="flex items-baseline space-x-2">
                           <span className="font-editorial font-black text-3xl text-white">{balance ? parseFloat(balance).toFixed(4) : '0.0000'}</span>
                           <span className="font-mono text-sm text-gray-400">ETH</span>
                         </div>
                      )}
                   </div>
                </div>
             ) : (
                <div className="w-full flex flex-col items-center justify-center py-8">
                   <div className="w-12 h-12 mb-4 rounded-full border border-yellow-electric/50 flex items-center justify-center">
                     <svg className="w-6 h-6 text-yellow-electric" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                     </svg>
                   </div>
                   <h4 className="font-editorial font-bold text-white text-lg uppercase tracking-widest mb-2">Initialize Treasury</h4>
                   <p className="font-mono text-xs text-gray-500 tracking-widest uppercase text-center max-w-md mb-8">
                      Deploy the foundational Safe Multisig Vault on Arbitrum One. Estimated network gas fee is typically &lt;$1.00 USD equivalent in ETH.
                   </p>
                   <button
                    onClick={deploySafeVault}
                    disabled={isDeploying}
                    className="px-6 py-3 bg-yellow-electric text-black font-editorial font-bold text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {isDeploying ? 'Deploying Vault...' : 'Deploy Safe Multisig'}
                   </button>
                </div>
             )}
           </div>
         )}
      </div>
    </div>
  );
};

export default PartnershipPayments;
