import React, { useState, useEffect } from 'react';
import { DriveConfig } from '../types';
import { Cloud, Check, AlertCircle, Save, Download, RefreshCw, Server } from 'lucide-react';

interface SyncWizardProps {
  config: DriveConfig;
  onConfigSave: (config: DriveConfig) => void;
  onBackup: () => Promise<void>;
  onRestore: (fileContent: string) => Promise<void>;
}

export const SyncWizard: React.FC<SyncWizardProps> = ({ config, onConfigSave, onBackup, onRestore }) => {
  const [step, setStep] = useState<number>(config.clientId ? 2 : 1);
  const [localConfig, setLocalConfig] = useState<DriveConfig>(config);
  const [status, setStatus] = useState<string>('');
  const [isBusy, setIsBusy] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleAuth = () => {
    if (!localConfig.clientId) {
      setStatus('Inserisci un Client ID valido.');
      return;
    }

    try {
       onConfigSave(localConfig);
       // @ts-ignore
       const client = google.accounts.oauth2.initTokenClient({
         client_id: localConfig.clientId,
         scope: 'https://www.googleapis.com/auth/drive.file',
         callback: (response: any) => {
           if (response.access_token) {
             setStatus('Autenticazione riuscita! Token ricevuto.');
             setStep(2);
           } else {
             setStatus('Errore autenticazione.');
           }
         },
       });
       client.requestAccessToken();
    } catch (e) {
      setStatus('Errore caricamento Google Script. Controlla connessione.');
    }
  };

  const handleManualBackup = async () => {
    setIsBusy(true);
    try {
        await onBackup();
        setStatus('Backup completato con successo!');
    } catch (e) {
        setStatus('Errore durante il backup: ' + e);
    } finally {
        setIsBusy(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
          if (evt.target?.result) {
              setIsBusy(true);
              try {
                  await onRestore(evt.target.result as string);
                  setStatus('Ripristino completato! Ricarica la pagina se necessario.');
              } catch (err) {
                  setStatus('Errore ripristino: File non valido.');
              } finally {
                  setIsBusy(false);
                  setFileInputKey(prev => prev + 1);
              }
          }
      }
      reader.readAsText(file);
  }

  return (
    <div className="max-w-4xl mx-auto py-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Cloud Sync</h2>
        <p className="text-slate-500">Backup e ripristino dati su Google Drive.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Status Card */}
        <div className="md:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${config.clientId ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Server className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800">Stato Connessione</h3>
                    <p className="text-sm text-slate-500">{config.clientId ? 'Configurato' : 'Non configurato'}</p>
                </div>
            </div>
             <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Ultimo Sync</p>
                <p className="font-mono text-slate-700">{config.lastSync ? new Date(config.lastSync).toLocaleString() : 'Mai'}</p>
             </div>
        </div>

        {/* Configuration Section */}
        <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-500" /> Impostazioni
             </h3>
             
             {step === 1 ? (
                 <div className="space-y-4">
                    <p className="text-xs text-slate-500">Inserisci Google Client ID per abilitare l'integrazione Drive.</p>
                    <input 
                        type="text" 
                        value={localConfig.clientId || ''}
                        onChange={(e) => setLocalConfig({...localConfig, clientId: e.target.value})}
                        placeholder="Client ID"
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                    <button 
                        onClick={handleAuth}
                        className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 text-sm font-medium transition-colors"
                    >
                        Connetti
                    </button>
                 </div>
             ) : (
                 <div className="space-y-4">
                     <p className="text-sm text-emerald-600 font-medium flex items-center gap-2">
                         <Check className="w-4 h-4" /> Account Collegato
                     </p>
                     <button 
                        onClick={() => setStep(1)}
                        className="text-xs text-slate-400 hover:text-slate-600 underline"
                    >
                        Cambia configurazione
                    </button>
                 </div>
             )}
        </div>

        {/* Operations Section */}
        <div className="md:col-span-2 space-y-6">
            
            {/* Messages */}
            {status && (
                <div className={`p-4 rounded-xl flex items-start gap-3 border ${status.includes('Errore') ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                    {status.includes('Errore') ? <AlertCircle className="w-5 h-5 mt-0.5" /> : <Check className="w-5 h-5 mt-0.5" />}
                    <p className="text-sm font-medium">{status}</p>
                </div>
            )}

            {step === 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                        onClick={handleManualBackup}
                        disabled={isBusy}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-6 rounded-2xl text-left transition-all shadow-lg shadow-indigo-600/10 group"
                    >
                        <Save className="w-8 h-8 mb-4 group-hover:scale-110 transition-transform" />
                        <h4 className="font-bold">Esegui Backup</h4>
                        <p className="text-indigo-200 text-sm mt-1">Scarica JSON / Upload Drive</p>
                    </button>

                    <label className="bg-white border-2 border-dashed border-slate-300 hover:border-indigo-400 cursor-pointer p-6 rounded-2xl text-left transition-all group relative">
                        <Download className="w-8 h-8 mb-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        <h4 className="font-bold text-slate-800">Ripristina</h4>
                        <p className="text-slate-500 text-sm mt-1">Carica file .json</p>
                        <input key={fileInputKey} type="file" accept=".json" className="hidden" onChange={handleFileSelect} disabled={isBusy} />
                    </label>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};
const Settings = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
);