import { useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Input,
  Label,
  Trash2,
} from "@hikai/ui";
import { useTranslation } from "react-i18next";
import { useDeleteProduct } from "../hooks";
import { Id } from "@hikai/convex/convex/_generated/dataModel";

interface DeleteProductDialogProps {
  productId: Id<"products">;
  productName: string;
  onDeleted: () => void;
  children?: React.ReactNode;
}

export function DeleteProductDialog({
  productId,
  productName,
  onDeleted,
  children,
}: DeleteProductDialogProps) {
  const { t } = useTranslation("products");
  const [open, setOpen] = useState(false);
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
      setOpen(false);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.unknown"));
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      setOpen(newOpen);
      if (!newOpen) {
        // Reset state when closing
        setConfirmName("");
        setError(null);
      }
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        {children || (
          <Button variant="destructive" size="sm">
            <Trash2 className="w-4 h-4 mr-2" />
            {t("common.delete")}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("delete.warning")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Alert variant="destructive">
          <AlertDescription>
            {t("delete.consequences")}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="confirm-name">
            {t("delete.confirmLabel", { name: productName })}
          </Label>
          <Input
            id="confirm-name"
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={productName}
            disabled={isLoading}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmValid || isLoading}
          >
            {isLoading ? t("delete.deleting") : t("delete.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
