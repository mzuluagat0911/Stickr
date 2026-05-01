"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { bulkMarkStickersAction } from "@/app/actions/album";
import {
  BULK_OPERATION_MAX_ITEMS,
  parseStickerNumberTokens,
  resolveStickerIdsFromNumbers,
} from "@/lib/album/bulk-numbers";
import type { CatalogStickerDTO } from "@/lib/album/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type BulkTargetStatus = "missing" | "have" | "duplicate";

export type AlbumBulkDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogEdition: CatalogStickerDTO[];
  onCommitted: () => Promise<void>;
};

export function AlbumBulkDialog({
  open,
  onOpenChange,
  catalogEdition,
  onCommitted,
}: AlbumBulkDialogProps) {
  const [tab, setTab] = useState<"paste" | "range">("paste");
  const [paste, setPaste] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [target, setTarget] = useState<BulkTargetStatus>("have");
  const [duplicateCount, setDuplicateCount] = useState(String(2));

  const resetForm = () => {
    setTab("paste");
    setPaste("");
    setRangeFrom("");
    setRangeTo("");
    setTarget("have");
    setDuplicateCount(String(2));
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next) resetForm();
  };

  const parsedPaste = useMemo(() => parseStickerNumberTokens(paste), [paste]);

  const resolvedPaste = useMemo(
    () => resolveStickerIdsFromNumbers(parsedPaste, catalogEdition),
    [parsedPaste, catalogEdition],
  );

  const parsedRangeNums = useMemo(() => {
    const a = Number(rangeFrom.trim());
    const b = Number(rangeTo.trim());
    if (
      !Number.isInteger(a) ||
      !Number.isInteger(b) ||
      a < 1 ||
      b < 1 ||
      a > 99999 ||
      b > 99999
    ) {
      return [] as number[];
    }
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (hi - lo + 1 > BULK_OPERATION_MAX_ITEMS) return [];
    const out: number[] = [];
    for (let i = lo; i <= hi; i++) out.push(i);
    return out;
  }, [rangeFrom, rangeTo]);

  const resolvedRange = useMemo(
    () => resolveStickerIdsFromNumbers(parsedRangeNums, catalogEdition),
    [parsedRangeNums, catalogEdition],
  );

  const dupN = Number(duplicateCount);
  const dupValid = Number.isInteger(dupN) && dupN >= 2 && dupN <= 10;

  const mutation = useMutation({
    mutationFn: async (input: {
      stickerIds: string[];
      target: BulkTargetStatus;
      duplicateCountApplied: number;
    }) => {
      const capped = input.stickerIds.slice(0, BULK_OPERATION_MAX_ITEMS);
      if (!capped.length) {
        throw new Error("No hay figuritas válidas para aplicar.");
      }
      const payload = capped.map((stickerId) => {
        if (input.target === "missing") {
          return { stickerId, status: "missing" as const };
        }
        if (input.target === "have") {
          return { stickerId, status: "have" as const };
        }
        return {
          stickerId,
          status: "duplicate" as const,
          count: input.duplicateCountApplied,
        };
      });
      const r = await bulkMarkStickersAction(payload);
      if (!r.ok) throw new Error(r.message);
      await onCommitted();
    },
    onSuccess: (_v, vars) => {
      const applied = Math.min(
        vars.stickerIds.length,
        BULK_OPERATION_MAX_ITEMS,
      );
      toast.success(
        applied >= BULK_OPERATION_MAX_ITEMS
          ? `Actualizamos ${applied} figuritas (máximo por lote).`
          : `Listo: ${applied} figurita${applied === 1 ? "" : "s"}.`,
      );
      handleOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const applyFromIds = (ids: string[], source: "paste" | "range") => {
    if (target === "duplicate" && !dupValid) {
      toast.error("Elige una cantidad de repetidas entre 2 y 10.");
      return;
    }
    if (!ids.length) {
      toast.error(
        source === "paste"
          ? "No reconocemos números válidos en el texto."
          : "El rango no es válido o supera el máximo permitido.",
      );
      return;
    }
    if (ids.length > BULK_OPERATION_MAX_ITEMS) {
      toast.message(
        `Se aplicarán solo las primeras ${BULK_OPERATION_MAX_ITEMS} figuritas de este lote.`,
      );
    }
    mutation.mutate({
      stickerIds: ids,
      target,
      duplicateCountApplied: target === "duplicate" ? dupN : 2,
    });
  };

  const pending = mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Marcado en lote</DialogTitle>
          <DialogDescription>
            Pega números o usa un rango. Se respetan solo figuritas de tu
            edición actual del catálogo. Máximo {BULK_OPERATION_MAX_ITEMS} por
            aplicación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Estado a aplicar</Label>
            <Select
              value={target}
              onValueChange={(v) => setTarget(v as BulkTargetStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="missing">Falta (borrar marca)</SelectItem>
                <SelectItem value="have">La tengo</SelectItem>
                <SelectItem value="duplicate">Repetida</SelectItem>
              </SelectContent>
            </Select>
            {target === "duplicate" ? (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs font-normal">
                  Cantidad total (ejemplares)
                </Label>
                <Select
                  value={duplicateCount}
                  onValueChange={setDuplicateCount}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        ×{n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "paste" | "range")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paste">Pegar lista</TabsTrigger>
              <TabsTrigger value="range">Por rango</TabsTrigger>
            </TabsList>
            <TabsContent value="paste" className="space-y-2 pt-2">
              <Textarea
                rows={6}
                placeholder="Ej.: 12, 15, 18-24, una por línea…"
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                autoComplete="off"
                className="font-mono text-sm"
              />
              <p className="text-muted-foreground text-xs">
                Válidas en catálogo:{" "}
                <span className="text-foreground font-medium">
                  {resolvedPaste.stickerIds.length}
                </span>
                {resolvedPaste.unmatched.length > 0 ? (
                  <>
                    {" "}
                    · Sin coincidencia:{" "}
                    {resolvedPaste.unmatched.slice(0, 12).join(", ")}
                    {resolvedPaste.unmatched.length > 12 ? "…" : ""}
                  </>
                ) : null}
              </p>
            </TabsContent>
            <TabsContent value="range" className="space-y-2 pt-2">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[7rem] flex-1 space-y-1">
                  <Label className="text-xs">Desde</Label>
                  <Input
                    inputMode="numeric"
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div className="min-w-[7rem] flex-1 space-y-1">
                  <Label className="text-xs">Hasta</Label>
                  <Input
                    inputMode="numeric"
                    value={rangeTo}
                    onChange={(e) => setRangeTo(e.target.value)}
                    placeholder="50"
                  />
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                Coinciden en catálogo:{" "}
                <span className="text-foreground font-medium">
                  {resolvedRange.stickerIds.length}
                </span>
                {parsedRangeNums.length === 0 &&
                (rangeFrom.trim() || rangeTo.trim()) ? (
                  <span className="text-destructive">
                    {" "}
                    · Rango inválido o demasiado amplio.
                  </span>
                ) : null}
              </p>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              applyFromIds(
                tab === "paste"
                  ? resolvedPaste.stickerIds
                  : resolvedRange.stickerIds,
                tab,
              )
            }
          >
            {pending ? "Aplicando…" : "Aplicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
