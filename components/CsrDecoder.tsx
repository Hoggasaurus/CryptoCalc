import React, { useState, useCallback } from 'react';
import Card from './Card';
import Button from './Button';
import { Icon } from './Icon';
import { debugLogger } from '../services/debugLogger';

// Declare jsrsasign for TypeScript since it's loaded from a script tag
declare var jsrsasign: any;

const DetailSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h3 className="text-lg font-semibold text-emerald-400 mb-3 border-b border-slate-700 pb-2">{title}</h3>
        <dl className="space-y-3">{children}</dl>
    </div>
);

const DetailField: React.FC<{ label: string, value: React.ReactNode, mono?: boolean }> = ({ label, value, mono = false }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-4 items-start">
        <dt className="text-sm font-medium text-slate-400">{label}</dt>
        <dd className={`text-sm text-slate-200 col-span-2 break-words ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
);


const CsrDecoder: React.FC = () => {
    const [input, setInput] = useState('');
    const [decodedData, setDecodedData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleClear = useCallback(() => {
        setInput('');
        setDecodedData(null);
        setError(null);
        debugLogger.log('CsrDecoder', 'Cleared input and results.');
    }, []);
    
    const handleDecode = useCallback(() => {
        const source = 'CsrDecoder';
        debugLogger.log(source, 'Attempting to decode input.');
        setError(null);
        setDecodedData(null);

        if (!input.trim()) {
            setError("Input cannot be empty.");
            debugLogger.log(source, 'Input is empty.');
            return;
        }

        try {
            let type: 'Certificate' | 'CSR' | 'Unknown' = 'Unknown';
            const upperInput = input.toUpperCase();
            if (upperInput.includes('-----BEGIN CERTIFICATE-----')) {
                type = 'Certificate';
            } else if (upperInput.includes('-----BEGIN CERTIFICATE REQUEST-----') || upperInput.includes('-----BEGIN NEW CERTIFICATE REQUEST-----')) {
                type = 'CSR';
            }

            if (type === 'Unknown') {
                throw new Error("Could not determine type. Missing PEM header for Certificate or CSR.");
            }
            
            debugLogger.log(source, `Detected type: ${type}`);
            
            let data;
            if (type === 'Certificate') {
                data = parseCertificate(input);
            } else { // CSR
                data = parseCsr(input);
            }
            
            setDecodedData({ type, data });
            debugLogger.log(source, 'SUCCESS: Decoded successfully.');
        } catch (e: any) {
            const err = e.message || 'An unexpected error occurred. Check format, content, and password protection.';
            setError(err);
            debugLogger.log(source, `ERROR: ${err}`);
            console.error(e);
        }
    }, [input]);
    
    return (
        <div className="max-w-4xl mx-auto">
            <Card title="CSR & Certificate Decoder">
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="csr-input" className="block text-sm font-medium text-slate-300 mb-1">
                            PEM Formatted CSR or Certificate
                        </label>
                        <textarea
                            id="csr-input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            rows={8}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white font-mono focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                            placeholder="-----BEGIN CERTIFICATE REQUEST-----\n..."
                        />
                    </div>
                    <div className="flex gap-4">
                        <Button onClick={handleDecode} className="w-full">
                            <Icon name="doc-text" /> Decode
                        </Button>
                         <Button onClick={handleClear} className="w-full !bg-slate-600 hover:!bg-slate-500">
                            Clear
                        </Button>
                    </div>
                    {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 p-3 rounded-md">{error}</p>}
                </div>
                
                {decodedData && <DecodedDataDisplay result={decodedData} />}
            </Card>
        </div>
    );
};

// Parsing Logic
const parseSubject = (dn: string) => ({
    string: dn,
    fields: jsrsasign.X509.getSubjects(dn),
});

const getKnownExtensions = (x509: any) => {
    const knownExts: {name: string, value: any, critical: boolean}[] = [];
    const addExt = (name: string, getter: () => any) => {
        try {
            const info = x509.getExtInfo(name);
            if (info) {
                knownExts.push({ name: info.extname, value: getter(), critical: info.critical });
            }
        } catch (e) { /* ignore if extension doesn't exist */ }
    };
    
    addExt('basicConstraints', () => x509.getExtBasicConstraints());
    addExt('keyUsage', () => x509.getExtKeyUsageString());
    addExt('subjectKeyIdentifier', () => x509.getExtSubjectKeyIdentifier().kid);
    addExt('authorityKeyIdentifier', () => x509.getExtAuthorityKeyIdentifier().kid);
    addExt('extKeyUsage', () => x509.getExtExtKeyUsageName().join(', '));
    addExt('subjectAltName', () => x509.getExtSubjectAltName().array.map((a: any[]) => a.join(':')).join(', '));
    addExt('cRLDistributionPoints', () => x509.getExtCRLDistributionPointsURI().join(', '));

    return knownExts;
};


const parseCertificate = (pem: string) => {
    const x509 = new jsrsasign.X509(pem);
    return {
        subject: parseSubject(x509.getSubjectString()),
        issuer: parseSubject(x509.getIssuerString()),
        version: x509.getVersion(),
        serialNumber: x509.getSerialNumberHex(),
        signatureAlgorithm: x509.getSignatureAlgorithmName(),
        validity: {
            notBefore: x509.getNotBefore(),
            notAfter: x509.getNotAfter(),
        },
        publicKey: x509.getPublicKey(),
        extensions: getKnownExtensions(x509),
    };
};

const parseCsr = (pem: string) => {
    const csr = new jsrsasign.KJUR.asn1.csr.CertificationRequest(pem);
    const attributes = csr.getAttributeInfoList().map((attr: any) => {
        let value = 'Complex value, not displayed';
        if (attr.type === 'extensionRequest') {
             value = attr.value.map((v: any) => v.name).join(', ');
        }
        return { name: attr.name, value: value };
    });

    return {
        subject: parseSubject(csr.getSubjectString()),
        publicKey: csr.getPublicKey(),
        attributes,
    };
};


// Display Components
const DecodedDataDisplay: React.FC<{result: any}> = ({ result }) => (
    <div className="p-6 border-t border-slate-700 space-y-6 animate-fade-in">
        {result.type === 'Certificate' && <RenderCertificate data={result.data} />}
        {result.type === 'CSR' && <RenderCsr data={result.data} />}
    </div>
);

const RenderSubject: React.FC<{ subject: { string: string, fields: [string, string][] } }> = ({ subject }) => (
    <pre className="text-xs whitespace-pre-wrap">{subject.string.replace(/, /g, '\n')}</pre>
);

const RenderPublicKey: React.FC<{ pk: any }> = ({ pk }) => {
    try {
        const keyObj = jsrsasign.KEYUTIL.getKey(pk);
        const keyInfo = `${keyObj.getAlgorithm().name} (${keyObj.getBitLength()} bit)`;
        const pem = jsrsasign.KEYUTIL.getPEM(keyObj);
        return (
            <>
                <p>{keyInfo}</p>
                <textarea readOnly value={pem} rows={6} className="w-full mt-2 p-2 bg-slate-900/70 rounded-md border border-slate-600 font-mono text-xs" />
            </>
        );
    } catch(e) {
        return <p className="text-red-400">Could not parse public key.</p>
    }
};

const RenderCertificate: React.FC<{ data: any }> = ({ data }) => (
    <div className="space-y-6">
        <DetailSection title="Subject">
            <DetailField label="Distinguished Name (DN)" value={<RenderSubject subject={data.subject} />} />
        </DetailSection>
        <DetailSection title="Issuer">
            <DetailField label="Distinguished Name (DN)" value={<RenderSubject subject={data.issuer} />} />
        </DetailSection>
        <DetailSection title="Certificate Details">
            <DetailField label="Version" value={data.version} />
            <DetailField label="Serial Number" value={data.serialNumber} mono />
            <DetailField label="Signature Algorithm" value={data.signatureAlgorithm} />
            <DetailField label="Valid From (UTC)" value={new Date(data.validity.notBefore).toUTCString()} />
            <DetailField label="Valid Until (UTC)" value={new Date(data.validity.notAfter).toUTCString()} />
        </DetailSection>
        <DetailSection title="Public Key Information">
            <DetailField label="Key Details" value={<RenderPublicKey pk={data.publicKey} />} />
        </DetailSection>
        {data.extensions.length > 0 &&
            <DetailSection title="X.509 Extensions">
                {data.extensions.map((ext: any, i: number) => (
                    <DetailField key={i} label={ext.name} value={<pre className="text-xs whitespace-pre-wrap">{ext.critical ? '(Critical) ' : ''}{JSON.stringify(ext.value, null, 2).replace(/"/g, '')}</pre>} />
                ))}
            </DetailSection>
        }
    </div>
);

const RenderCsr: React.FC<{ data: any }> = ({ data }) => (
    <div className="space-y-6">
        <DetailSection title="Subject">
            <DetailField label="Distinguished Name (DN)" value={<RenderSubject subject={data.subject} />} />
        </DetailSection>
        <DetailSection title="Public Key Information">
            <DetailField label="Key Details" value={<RenderPublicKey pk={data.publicKey} />} />
        </DetailSection>
        {data.attributes.length > 0 &&
             <DetailSection title="Attributes">
                {data.attributes.map((attr: any, i: number) => (
                    <DetailField key={i} label={attr.name} value={attr.value} />
                ))}
            </DetailSection>
        }
    </div>
);

export default CsrDecoder;
