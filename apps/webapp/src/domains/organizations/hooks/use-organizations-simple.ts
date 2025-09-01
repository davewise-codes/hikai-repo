import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

// Hook de debug para verificar autenticación
export function useDebugAuth() {
  return useQuery(api.organizations.organizations.debugAuth as any, {}) as any;
}

// Hooks simplificados sin tipos complejos para evitar problemas de TypeScript
export function useListOrganizations() {
  return useQuery(api.organizations.organizations.listOrganizations as any, {}) as any;
}

export function useUserOrganizations() {
  return useQuery(api.organizations.organizations.getUserOrganizations as any, {}) as any;
}

export function useOrganizationBySlug(slug: string) {
  return useQuery(api.organizations.organizations.getOrganizationBySlug as any, { slug }) as any;
}

export function useCreateOrganization() {
  return useMutation(api.organizations.organizations.createOrganization as any) as any;
}

export function useCreateOrganizationTest() {
  return useMutation(api.organizations.organizations.createOrganizationTest as any) as any;
}

export function useUpdateOrganization() {
  return useMutation(api.organizations.organizations.updateOrganization as any) as any;
}

export function useDeleteOrganization() {
  return useMutation(api.organizations.organizations.deleteOrganization as any) as any;
}

export function useAddMember() {
  return useMutation(api.organizations.organizations.addMember as any) as any;
}

export function useRemoveMember() {
  return useMutation(api.organizations.organizations.removeMember as any) as any;
}

// Types for forms
export interface CreateOrganizationData {
  name: string;
  slug: string;
  description?: string;
}

// Hook helper with error handling
export function useOrganizationsActions() {
  const createOrganization = useCreateOrganization();
  const createOrganizationTest = useCreateOrganizationTest();

  const createOrganizationSafe = async (data: CreateOrganizationData) => {
    try {
      const organizationId = await createOrganization(data);
      console.log("Organization created:", organizationId);
      return { success: true as const, organizationId };
    } catch (error) {
      console.error("Error creating organization:", error);
      return { success: false as const, error: error instanceof Error ? error.message : "Error desconocido" };
    }
  };

  const createOrganizationTestSafe = async (data: CreateOrganizationData) => {
    try {
      const organizationId = await createOrganizationTest(data);
      console.log("Test organization created:", organizationId);
      return { success: true as const, organizationId };
    } catch (error) {
      console.error("Error creating test organization:", error);
      return { success: false as const, error: error instanceof Error ? error.message : "Error desconocido" };
    }
  };

  return {
    createOrganization,
    createOrganizationSafe,
    createOrganizationTestSafe,
  };
}