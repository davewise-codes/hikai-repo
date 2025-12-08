import { Button, Trash2 } from "@hikai/ui";
import { useTranslation } from "react-i18next";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import { ConfirmDeleteDialog } from "@/domains/shared";
import { useDeleteProduct } from "../hooks";

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
  const deleteProduct = useDeleteProduct();

  return (
    <ConfirmDeleteDialog
      entityName={productName}
      translations={{
        title: t("delete.title"),
        description: t("delete.warning"),
        warningMessage: t("delete.consequences"),
        confirmLabel: t("delete.confirmLabel", { name: productName }),
        confirmButtonLabel: t("delete.confirm"),
        confirmingLabel: t("delete.deleting"),
        cancelLabel: t("common.cancel"),
      }}
      onConfirm={() => deleteProduct({ productId })}
      onSuccess={onDeleted}
    >
      {children || (
        <Button variant="destructive" size="sm">
          <Trash2 className="w-4 h-4 mr-2" />
          {t("common.delete")}
        </Button>
      )}
    </ConfirmDeleteDialog>
  );
}
