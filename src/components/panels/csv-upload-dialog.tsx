"use client";

import { useState, useCallback, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Upload, FileText, AlertCircle, Check } from "lucide-react";
import { importCsv, type CsvImportResult } from "@/lib/csv-import";
import type { FinancialNodeData, FinancialFlowData } from "@/types/graph";
import { getNodeColor } from "@/lib/graph-theme";

interface CsvUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingNodeIds: Set<string>;
  onImport: (nodes: FinancialNodeData[], flows: FinancialFlowData[]) => void;
}

export function CsvUploadDialog({
  open,
  onOpenChange,
  existingNodeIds,
  onImport,
}: CsvUploadDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFileName(null);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      setResult(null);
      setFileName(file.name);

      if (!file.name.endsWith(".csv")) {
        setError("Please upload a .csv file.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text || text.trim().length === 0) {
          setError("File is empty.");
          return;
        }
        const importResult = importCsv(text, existingNodeIds);
        setResult(importResult);
      };
      reader.onerror = () => setError("Failed to read file.");
      reader.readAsText(file);
    },
    [existingNodeIds]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleConfirm = useCallback(() => {
    if (!result) return;
    onImport(result.generatedNodes, result.generatedFlows);
    reset();
    onOpenChange(false);
  }, [result, onImport, reset, onOpenChange]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, reset]
  );

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-zinc-950 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <Dialog.Title className="text-sm font-semibold text-zinc-100">
              Import CSV
            </Dialog.Title>
            <Dialog.Close className="rounded-md p-1 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/10 bg-white/[0.02] py-8 cursor-pointer hover:border-white/20 transition"
            >
              <Upload className="h-6 w-6 text-zinc-500" />
              <p className="text-xs text-zinc-400">
                Drop a CSV file here or click to browse
              </p>
              <p className="text-[10px] text-zinc-600">
                Expects columns: Description, Amount (and optionally Date, Category)
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* File name */}
            {fileName && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <FileText className="h-3.5 w-3.5" />
                <span>{fileName}</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            {/* Warnings */}
            {result && result.warnings.length > 0 && (
              <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 space-y-1">
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-yellow-300">
                    {w}
                  </p>
                ))}
              </div>
            )}

            {/* Preview */}
            {result && result.generatedNodes.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                  Preview — {result.rows.length} transactions → {result.generatedNodes.length} nodes, {result.generatedFlows.length} connections
                </p>

                <div className="max-h-48 overflow-y-auto rounded-lg border border-white/5 bg-white/[0.02]">
                  {result.generatedNodes.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center gap-2 px-3 py-2 border-b border-white/5 last:border-0"
                    >
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: getNodeColor(n.type) }}
                      />
                      <span className="text-xs text-zinc-300 flex-1 truncate">
                        {n.label}
                      </span>
                      <span className="text-[10px] text-zinc-500 capitalize">
                        {n.type}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        ${n.monthlyFlow.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result && result.generatedNodes.length === 0 && result.warnings.length === 0 && (
              <p className="text-xs text-zinc-500">
                No new nodes could be generated from this file.
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-white/5 px-5 py-3">
            <Dialog.Close className="rounded-lg border border-white/10 px-4 py-2 text-xs text-zinc-400 hover:bg-white/5 transition">
              Cancel
            </Dialog.Close>
            <button
              disabled={!result || result.generatedNodes.length === 0}
              onClick={handleConfirm}
              className="flex items-center gap-1.5 rounded-lg bg-finco-blue px-4 py-2 text-xs font-medium text-black hover:bg-finco-blue/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="h-3.5 w-3.5" />
              Import {result ? result.generatedNodes.length : 0} Nodes
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
