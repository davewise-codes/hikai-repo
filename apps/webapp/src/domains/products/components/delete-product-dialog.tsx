import { Button, Trash2 } from "@hikai/ui";
import { useTranslation } from "react-i18next";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import { ConfirmDeleteDialog } from "@/domains/shared";
import { useDeleteProduct } from "../hooks";

interface DeleteProductDialogBaseProps {
  productId: Id<"products">;
  productName: string;
  onDeleted: () => void;
}

interface DeleteProductDialogTriggerProps extends DeleteProductDialogBaseProps {
  children?: React.ReactNode;
  open?: never;
  onOpenChange?: never;
}

interface DeleteProductDialogControlledProps extends DeleteProductDialogBaseProps {
  children?: never;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DeleteProductDialogProps =
  | DeleteProductDialogTriggerProps
  | DeleteProductDialogControlledProps;

export function DeleteProductDialog({
  productId,
  productName,
  onDeleted,
  children,
  open,
  onOpenChange,
}: DeleteProductDialogProps) {
  const { t } = useTranslation("products");
  const deleteProduct = useDeleteProduct();

  const baseProps = {
    entityName: productName,
    translations: {
      title: t("delete.title"),
      description: t("delete.warning"),
      warningMessage: t("delete.consequences"),
      confirmLabel: t("delete.confirmLabel", { name: productName }),
      confirmButtonLabel: t("delete.confirm"),
      confirmingLabel: t("delete.deleting"),
      cancelLabel: t("common.cancel"),
    },
    onConfirm: () => deleteProduct({ productId }),
    onSuccess: onDeleted,
  };

  // Controlled mode
  if (open !== undefined && onOpenChange !== undefined) {
    return (
      <ConfirmDeleteDialog {...baseProps} open={open} onOpenChange={onOpenChange} />
    );
  }

  // Trigger mode
  return (
    <ConfirmDeleteDialog {...baseProps}>
      {children || (
        <Button variant="destructive" size="sm">
          <Trash2 className="w-4 h-4 mr-2" />
          {t("common.delete")}
        </Button>
      )}
    </ConfirmDeleteDialog>
  );
}
