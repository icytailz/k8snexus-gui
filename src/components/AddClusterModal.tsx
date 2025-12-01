import React, { useState } from 'react';
import { X } from 'lucide-react';
import { NewClusterConfig, PROVIDERS, ProviderType, EnvType } from '../types';

interface AddClusterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (config: NewClusterConfig) => void;
}

export const AddClusterModal = ({ isOpen, onClose, onAdd }: AddClusterModalProps) => {
    const [name, setName] = useState('');
    const [provider, setProvider] = useState<ProviderType>('aws');
    const [region, setRegion] = useState('');
    const [environment, setEnvironment] = useState<EnvType>('dev');
    const [kubeconfig, setKubeconfig] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalRegion = provider === 'local' ? 'local' : region;
        onAdd({ name, provider, region: finalRegion, environment, kubeconfig });
        onClose();
        // Reset form
        setName('');
        setProvider('aws');
        setRegion('');
        setEnvironment('dev');
        setKubeconfig('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="glass border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                    <h3 className="text-lg font-bold text-white tracking-tight">Add New Cluster</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cluster Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all duration-200 placeholder:text-slate-600"
                            placeholder="e.g. production-cluster-01"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Provider</label>
                        <select
                            value={provider}
                            onChange={(e) => setProvider(e.target.value as ProviderType)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all duration-200 appearance-none"
                        >
                            {PROVIDERS.map(p => (
                                <option key={p.id} value={p.id} className="bg-slate-900">{p.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {(provider as string) !== 'local' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Region</label>
                                <input
                                    type="text"
                                    required={(provider as string) !== 'local'}
                                    value={region}
                                    onChange={(e) => setRegion(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all duration-200 placeholder:text-slate-600"
                                    placeholder="e.g. us-east-1"
                                />
                            </div>
                        )}
                        <div className={provider === 'local' ? 'col-span-2' : ''}>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Environment</label>
                            <select
                                value={environment}
                                onChange={(e) => setEnvironment(e.target.value as EnvType)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all duration-200 appearance-none"
                            >
                                <option value="local" className="bg-slate-900">Local</option>
                                <option value="dev" className="bg-slate-900">Development</option>
                                <option value="prod" className="bg-slate-900">Production</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kubeconfig (YAML)</label>
                        <textarea
                            value={kubeconfig}
                            onChange={(e) => setKubeconfig(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all duration-200 h-32 placeholder:text-slate-600"
                            placeholder="apiVersion: v1..."
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-600/20 transition-all duration-200"
                        >
                            Add Cluster
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
