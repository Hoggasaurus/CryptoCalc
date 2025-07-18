
import React, { useState, useCallback } from 'react';
import { KeyComponent } from './types';
import { generateRandomHex, calculateKcv } from './services/cryptoService';
import Card from './components/Card';
import Button from './components/Button';
import ResultDisplay from './components/ResultDisplay';
import KeyAssembler from './components/KeyAssembler';
import Tooltip from './components/Tooltip';
import { Icon } from './components/Icon';
import PinBlockGenerator from './components/PinBlockGenerator';
import RsaGenerator from './components/RsaGenerator';
import DataEncryptor from './components/DataEncryptor';
import FormatConverter from './components/FormatConverter';
import { useDebug } from './contexts/DebugContext';
import DebugLog from './components/DebugLog';
import { debugLogger } from './services/debugLogger';

type Tab = 'keys' | 'encryption' | 'pinblocks' | 'rsa' | 'converter';

const TabButton: React.FC<{isActive: boolean, onClick: () => void, children: React.ReactNode}> = ({ isActive, onClick, children }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all duration-200 focus:outline-none -mb-px
            ${isActive 
                ? 'border-emerald-400 text-emerald-400' 
                : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
            }`}
    >
        {children}
    </button>
);


const App: React.FC = () => {
  const [components, setComponents] = useState<KeyComponent[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('keys');
  const { isDebugMode, setDebugMode, clearLogs } = useDebug();

  const handleTabChange = useCallback((tab: Tab) => {
      setActiveTab(tab);
      clearLogs();
  }, [clearLogs]);

  const handleGenerateComponent = useCallback((kcvType: 'AES' | '3DES', bytesToGenerate: number) => {
    const source = 'KeyComponentGenerator';
    debugLogger.log(source, `Generating ${bytesToGenerate}-byte component for ${kcvType}.`);
    const value = generateRandomHex(bytesToGenerate);
    const kcv = calculateKcv({ keyHex: value, algorithm: kcvType });
    debugLogger.log(source, `Generated component value: ${value}`);
    debugLogger.log(source, `Calculated KCV: ${kcv}`);
    
    const newComponent: KeyComponent = {
      id: `comp-${Date.now()}-${Math.random()}`,
      value,
      kcv,
      kcvType,
    };
    setComponents(prev => [newComponent, ...prev]);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Cryptographic <span className="text-emerald-400">Utilities</span>
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-3xl mx-auto">
            A versatile toolkit for cryptographic key management, PIN blocks, data encryption, and format conversion.
          </p>
        </header>

        <div className="mb-8 border-b border-slate-700 flex justify-center flex-wrap">
            <TabButton isActive={activeTab === 'keys'} onClick={() => handleTabChange('keys')}>
                <Icon name="key" /> Key Calculator
            </TabButton>
            <TabButton isActive={activeTab === 'encryption'} onClick={() => handleTabChange('encryption')}>
                <Icon name="lock-open" /> Data Encryption
            </TabButton>
            <TabButton isActive={activeTab === 'pinblocks'} onClick={() => handleTabChange('pinblocks')}>
                <Icon name="shield-check" /> PIN Block Generator
            </TabButton>
            <TabButton isActive={activeTab === 'rsa'} onClick={() => handleTabChange('rsa')}>
                <Icon name="lock-closed" /> RSA Key Pair
            </TabButton>
            <TabButton isActive={activeTab === 'converter'} onClick={() => handleTabChange('converter')}>
                <Icon name="arrows-right-left" /> Format Converter
            </TabButton>
        </div>

        {activeTab === 'keys' && (
          <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            <Card title="1. Key Component Generator">
              <div className="p-6">
                 <div className="space-y-6">
                  <div>
                      <h3 className="text-base font-medium text-slate-300 mb-3">AES Components</h3>
                      <div className="flex flex-wrap gap-4 items-center">
                          <Button onClick={() => handleGenerateComponent('AES', 16)}><Icon name="sparkles" /> Gen 16-Byte</Button>
                          <Button onClick={() => handleGenerateComponent('AES', 24)}><Icon name="sparkles" /> Gen 24-Byte</Button>
                          <Button onClick={() => handleGenerateComponent('AES', 32)}><Icon name="sparkles" /> Gen 32-Byte</Button>
                      </div>
                  </div>
                  <div>
                      <h3 className="text-base font-medium text-slate-300 mb-3">3DES Components</h3>
                      <div className="flex flex-wrap gap-4 items-center">
                          <Button onClick={() => handleGenerateComponent('3DES', 16)}><Icon name="sparkles" /> Gen 16-Byte</Button>
                          <Button onClick={() => handleGenerateComponent('3DES', 24)}><Icon name="sparkles" /> Gen 24-Byte</Button>
                          <Tooltip text="A Key Check Value (KCV) is derived by encrypting a block of nulls with a key and taking the first 3 bytes of the result. For 8-byte 3DES components, the KCV is calculated on a temporary 16-byte key formed by duplicating the component.">
                              <div className="flex items-center gap-2 text-slate-400 cursor-help">
                                  <Icon name="info" />
                                  <span>What is a KCV?</span>
                              </div>
                          </Tooltip>
                      </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-slate-700">
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                  {components.length === 0 && (
                    <div className="text-center py-10 px-4 border-2 border-dashed border-slate-700 rounded-lg">
                      <p className="text-slate-400">No components generated yet.</p>
                      <p className="text-sm text-slate-500">Click a generate button above to start.</p>
                    </div>
                  )}
                  {components.map((comp) => (
                    <div key={comp.id} className="bg-slate-800/70 p-4 rounded-lg border border-slate-700 transition-all hover:border-emerald-500/50">
                      <ResultDisplay label={`Component Value (${comp.value.length / 2} Bytes)`} value={comp.value} />
                      <div className="mt-3">
                        <ResultDisplay label={`${comp.kcvType} KCV`} value={comp.kcv} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            
            <KeyAssembler availableComponents={components} />
          </main>
        )}

        {activeTab === 'encryption' && (
           <main className="animate-fade-in">
              <DataEncryptor />
           </main>
        )}

        {activeTab === 'pinblocks' && (
           <main className="animate-fade-in">
              <PinBlockGenerator />
           </main>
        )}

        {activeTab === 'rsa' && (
           <main className="animate-fade-in">
              <RsaGenerator />
           </main>
        )}
        
        {activeTab === 'converter' && (
           <main className="animate-fade-in">
              <FormatConverter />
           </main>
        )}

        <DebugLog />

        <footer className="text-center mt-12 text-slate-500 text-sm">
           <div className="flex justify-center items-center gap-2 mb-4">
              <input 
                  type="checkbox" 
                  id="debug-toggle" 
                  checked={isDebugMode} 
                  onChange={(e) => setDebugMode(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
              />
              <label htmlFor="debug-toggle" className="text-slate-400 cursor-pointer">Show Debug Log</label>
          </div>
          <p>Built by Chris Hogg</p>
          <p>&copy; {new Date().getFullYear()}. All Rights Reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
