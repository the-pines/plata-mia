export * from './xxProxy.mock'
export { register as registerMock, lookup as lookupMock, updatePreferredChain as updatePreferredChainMock, hashHint as hashHintMock, type StealthMetaAddress as MockStealthMetaAddress } from './registry.mock'
export { RegistryService, getRegistry, clearRegistry, hashHint, type StealthMetaAddress } from './registry'
export * from './evmSubstrateAdapter'
