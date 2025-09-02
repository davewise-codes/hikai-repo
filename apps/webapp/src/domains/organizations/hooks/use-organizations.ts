import { useQuery, useMutation } from "convex/react";
import { api } from "@hikai/convex";

// Hook para obtener todas las organizaciones
export function useListOrganizations() {
  return useQuery(api.organizations.organizations.listOrganizations, {});
}

// Hook para obtener las organizaciones del usuario actual
export function useUserOrganizations() {
  return useQuery(api.organizations.organizations.getUserOrganizations, {});
}

// Hook para obtener una organización específica por slug
export function useOrganizationBySlug(slug: string) {
  return useQuery(api.organizations.organizations.getOrganizationBySlug, { slug });
}

// Hook para obtener los miembros de una organización
export function useOrganizationMembers(organizationId: string) {
  return useQuery(api.organizations.organizations.getOrganizationMembers, {
    organizationId: organizationId as any,
  });
}

// Hook para crear una organización
export function useCreateOrganization() {
  return useMutation(api.organizations.organizations.createOrganization);
}

// Hook para actualizar una organización
export function useUpdateOrganization() {
  return useMutation(api.organizations.organizations.updateOrganization);
}

// Hook para eliminar una organización
export function useDeleteOrganization() {
  return useMutation(api.organizations.organizations.deleteOrganization);
}

// Hook para añadir un miembro
export function useAddMember() {
  return useMutation(api.organizations.organizations.addMember);
}

// Hook para eliminar un miembro
export function useRemoveMember() {
  return useMutation(api.organizations.organizations.removeMember);
}

// Types para los forms
export interface CreateOrganizationData {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateOrganizationData {
  organizationId: string;
  name?: string;
  description?: string;
}

export interface AddMemberData {
  organizationId: string;
  userEmail: string;
  role: "admin" | "member";
}

// Hook compuesto para gestionar organizaciones con estados de loading y error
export function useOrganizationsActions() {
  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization();
  const deleteOrganization = useDeleteOrganization();
  const addMember = useAddMember();
  const removeMember = useRemoveMember();

  return {
    createOrganization,
    updateOrganization,
    deleteOrganization,
    addMember,
    removeMember,
    
    // Helper para crear una organización con manejo de errores
    createOrganizationSafe: async (data: CreateOrganizationData) => {
      try {
        const organizationId = await createOrganization(data);
        console.log("Organization created:", organizationId);
        return { success: true as const, organizationId };
      } catch (error) {
        console.error("Error creating organization:", error);
        return { success: false as const, error: error instanceof Error ? error.message : "Error desconocido" };
      }
    },

    // Helper para actualizar una organización con manejo de errores
    updateOrganizationSafe: async (data: any) => {
      try {
        const organizationId = await updateOrganization(data);
        console.log("Organization updated:", organizationId);
        return { success: true as const, organizationId };
      } catch (error) {
        console.error("Error updating organization:", error);
        return { success: false as const, error: error instanceof Error ? error.message : "Error desconocido" };
      }
    },

    // Helper para añadir miembro con manejo de errores
    addMemberSafe: async (data: any) => {
      try {
        const membershipId = await addMember(data);
        console.log("Member added:", membershipId);
        return { success: true as const, membershipId };
      } catch (error) {
        console.error("Error adding member:", error);
        return { success: false as const, error: error instanceof Error ? error.message : "Error desconocido" };
      }
    },
  };
}