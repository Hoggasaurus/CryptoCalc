import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Algorithm, KeyComponent } from '../types';
import { KEY_ALGORITHMS } from '../constants';
import { calculateKcv, xorHexStrings } from '../services/cryptoService';
import Card from './Card';
import Button from './Button';
import ResultDisplay from './ResultDisplay';
import { Icon } from './Icon';
import { debugLogger } from '../services/debugLogger';
import SegmentedControl from './SegmentedControl';

interface KeyAssemblerProps {
  availableComponents: KeyComponent[];
}

const KeyAssembler: React.FC<KeyAssemblerProps> = ({ availableComponents }) => {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<Algorithm>(Algorithm.AES_128_2_PART);
  const [componentInputs, setComponentInputs] = useState<string[]>(['', '']);
  const [assembledKey, setAssembledKey] = useState<{ value: string; kcv: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const config = KEY_ALGORITHMS[selectedAlgorithm];

  // Derive UI state from the single source of truth: `selectedAlgorithm`
  const { family, strength, parts } = useMemo(() => {
    const algorithmParts = selectedAlgorithm.split('_');
    const partCount = parseInt(algorithmParts[2], 10) as 1 | 2 | 3;

    if (selectedAlgorithm.startsWith('AES')) {
      const strengthValue = algorithmParts[1] as '128' | '192' | '256';
      return { family: 'AES' as const, strength: strengthValue, parts: partCount };
    } else { // 3DES
      const strengthValue = selectedAlgorithm.includes('2KEY') ? 'Double Length' as const : 'Triple Length' as const;
      return { family: '3DES' as const, strength: strengthValue, parts: partCount };
    }
  }, [selectedAlgorithm]);

  useEffect(() => {
    debugLogger.log('KeyAssembler', `Algorithm changed to: ${config.name}. Resetting inputs for ${config.componentCount} component(s).`);
    setComponentInputs(Array(config.componentCount).fill(''));
    setAssembledKey(null);
    setError(null);
  }, [selectedAlgorithm, config.componentCount, config.name]);

  // Handlers to update the selectedAlgorithm based on UI changes
  const handleFamilyChange = (newFamily: 'AES' | '3DES') => {
    if (newFamily === 'AES') {
      setSelectedAlgorithm(Algorithm.AES_128_2_PART); // Default to a common AES type
    } else {
      setSelectedAlgorithm(Algorithm.TDES_2KEY_2_PART); // Default to a common 3DES type
    }
  };

  const handleStrengthChange = (newStrength: '128' | '192' | '256' | 'Double Length' | 'Triple Length') => {
    let newAlgo: string;
    if (family === 'AES') {
      newAlgo = `AES_${newStrength}_${parts}_PART`;
    } else {
      const desTypeString = newStrength === 'Double Length' ? 'TDES_2KEY' : 'TDES_3KEY';
      newAlgo = `${desTypeString}_${parts}_PART`;
    }
    setSelectedAlgorithm(newAlgo as Algorithm);
  };

  const handlePartsChange = (newParts: 1 | 2 | 3) => {
    let newAlgo: string;
    if (family === 'AES') {
      newAlgo = `AES_${strength}_${newParts}_PART`;
    } else {
      const desTypeString = strength === 'Double Length' ? 'TDES_2KEY' : 'TDES_3KEY';
      newAlgo = `${desTypeString}_${newParts}_PART`;
    }
    setSelectedAlgorithm(newAlgo as Algorithm);
  };

  const handleInputChange = (index: number, value: string) => {
    const newInputs = [...componentInputs];
    newInputs[index] = value.replace(/[^0-9a-fA-F]/g, ''); // Allow only hex characters
    setComponentInputs(newInputs);
    setAssembledKey(null);
    setError(null);
  };
  
  const handlePasteLastGenerated = (index: number) => {
    const source = 'KeyAssembler';
    if (availableComponents.length > 0) {
        const requiredLength = config.componentLengthBytes * 2;
        const lastComponentValue = availableComponents[0].value;
        const valueToPaste = lastComponentValue.substring(0, requiredLength);
        debugLogger.log(source, `Pasting last generated component into input ${index + 1}. Value: ${valueToPaste}`);
        handleInputChange(index, valueToPaste);
    } else {
        debugLogger.log(source, 'Paste button clicked, but no generated components are available.');
    }
  };

  const handleAssemble = useCallback(() => {
    const source = 'KeyAssembler';
    debugLogger.log(source, `Attempting to assemble key with algorithm: ${config.name}`);
    debugLogger.log(source, `Inputs: ${JSON.stringify(componentInputs)}`);

    setError(null);
    const requiredLength = config.componentLengthBytes * 2;
    const componentsToProcess: string[] = [];

    for (let i = 0; i < config.componentCount; i++) {
      const input = componentInputs[i];
      if (input.length !== requiredLength) {
        const errorMsg = `Component ${i + 1} must be ${requiredLength} hex characters long.`;
        setError(errorMsg);
        debugLogger.log(source, `Validation FAILED: ${errorMsg}`);
        return;
      }
      componentsToProcess.push(input);
    }
    
    debugLogger.log(source, 'All components passed validation.');
    const finalKeyHex = (config.componentCount > 1)
      ? xorHexStrings(componentsToProcess)
      : componentsToProcess[0];

    if (finalKeyHex === 'Error') {
        const errorMsg = 'An error occurred during the XOR operation. Check component lengths.';
        setError(errorMsg);
        debugLogger.log(source, `ERROR: ${errorMsg}`);
        return;
    }

    debugLogger.log(source, `Successfully assembled key: ${finalKeyHex.toUpperCase()}`);

    const kcv = calculateKcv({ keyHex: finalKeyHex, algorithm: config.kcvType });
    debugLogger.log(source, `Calculated final KCV: ${kcv}`);
    setAssembledKey({ value: finalKeyHex.toUpperCase(), kcv });

  }, [componentInputs, config]);
  
  const familyOptions = [
    { label: 'AES', value: 'AES' as const },
    { label: '3DES', value: '3DES' as const },
  ];

  const strengthOptions = family === 'AES'
    ? [
        { label: '128-bit', value: '128' as const },
        { label: '192-bit', value: '192' as const },
        { label: '256-bit', value: '256' as const },
      ]
    : [
        { label: 'Double Length', value: 'Double Length' as const },
        { label: 'Triple Length', value: 'Triple Length' as const },
      ];
      
  const partOptions = [
    { label: '1 Part', value: 1 as const },
    { label: '2 Parts', value: 2 as const },
    { label: '3 Parts', value: 3 as const },
  ];

  return (
    <Card title="2. Key Assembler">
      <div className="p-6 space-y-6">
        <div className="space-y-4">
            <SegmentedControl
                label="Algorithm Family"
                options={familyOptions}
                value={family}
                onChange={handleFamilyChange}
            />
            <SegmentedControl
                label="Key Strength"
                options={strengthOptions}
                value={strength}
                onChange={handleStrengthChange}
            />
            <SegmentedControl
                label="Number of Components"
                options={partOptions}
                value={parts}
                onChange={handlePartsChange}
            />
        </div>

        <div className="pt-6 border-t border-slate-700">
            <div className="text-center text-sm text-slate-400 font-semibold mb-4 bg-slate-700/30 p-2 rounded-md">
                {config.name}
            </div>
            <div className="space-y-4">
                {componentInputs.map((value, index) => (
                    <div key={index}>
                    <label className="block text-sm font-medium text-slate-300">
                        Component {index + 1} ({config.componentLengthBytes} Bytes / {config.componentLengthBytes * 2} Hex)
                    </label>
                    <div className="mt-1 flex items-stretch gap-2">
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => handleInputChange(index, e.target.value)}
                            maxLength={config.componentLengthBytes * 2}
                            className="flex-grow w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white font-mono focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                            placeholder={`${config.componentLengthBytes * 2} hex characters...`}
                        />
                        <Button
                            onClick={() => handlePasteLastGenerated(index)}
                            disabled={availableComponents.length === 0}
                            className="!px-3 bg-slate-600 hover:bg-slate-500"
                            title="Paste most recently generated component"
                        >
                            <Icon name="copy" className="w-4 h-4" />
                        </Button>
                    </div>
                    </div>
                ))}
            </div>
        
            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

            <Button onClick={handleAssemble} className="w-full !mt-6">
                <Icon name="key"/>
                Assemble Key & Calculate KCV
            </Button>

            {assembledKey && (
                <div className="!mt-8 pt-6 border-t border-slate-700 space-y-4 animate-fade-in">
                    <h3 className="text-lg font-semibold text-emerald-400">Assembled Key Details</h3>
                    <ResultDisplay label="Final Assembled Key" value={assembledKey.value} />
                    <ResultDisplay label={`Final ${config.kcvType} KCV`} value={assembledKey.kcv} size="sm" />
                </div>
            )}
        </div>
      </div>
    </Card>
  );
};

export default KeyAssembler;