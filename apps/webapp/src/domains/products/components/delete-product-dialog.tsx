import { useState } from "react";
import {
  Button,
  Input,
  Label,
  AlertCircle,
} from "@hikai/ui";
import { useTranslation } from "react-i18next";
import { useDeleteProduct } from "../hooks";
import { Id } from "@hikai/convex/convex/_generated/dataModel";

interface DeleteProductDialogProps {
  productId: Id<"products">;
  productName: string;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteProductDialog({
  productId,
  productName,
  onClose,
  onDeleted,
}: DeleteProductDialogProps) {
  const { t } = useTranslation("common");
  const [confirmName, setConfirmName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteProduct = useDeleteProduct();

  const isConfirmValid = confirmName === productName;

  const handleDelete = async () => {
    if (!isConfirmValid) return;

    setIsLoading(true);
    setError(null);

    try {
      await deleteProduct({ productId });
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("products.errors.unknown"));
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-background rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {t("products.delete.title")}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t("products.delete.warning")}
            </p>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 mb-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            {t("products.delete.consequences")}
          </p>
        </div>

        <div className="mb-4">
          <Label htmlFor="confirm-name">
            {t("products.delete.confirmLabel", { name: productName })}
          </Label>
          <Input
            id="confirm-name"
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={productName}
            disabled={isLoading}
            className="mt-2"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmValid || isLoading}
          >
            {isLoading ? t("products.delete.deleting") : t("products.delete.confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
