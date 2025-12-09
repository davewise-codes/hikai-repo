import { useQuery, useMutation } from "convex/react";
import { api } from "@hikai/convex";
import { Id } from "@hikai/convex/convex/_generated/dataModel";

export function useConnections(productId: Id<"products"> | undefined) {
	const connections = useQuery(
		api.connectors.connections.listByProduct,
		productId ? { productId } : "skip"
	);

	return { connections, isLoading: connections === undefined };
}

export function useConnectorTypes(productId: Id<"products"> | undefined) {
	const connectorTypes = useQuery(
		api.connectors.connections.listConnectorTypes,
		productId ? { productId } : "skip"
	);

	return { connectorTypes, isLoading: connectorTypes === undefined };
}

export function useConnectionMutations() {
	const createConnection = useMutation(api.connectors.connections.create);
	const removeConnection = useMutation(api.connectors.connections.remove);
	const updateStatus = useMutation(api.connectors.connections.updateStatus);

	return { createConnection, removeConnection, updateStatus };
}
