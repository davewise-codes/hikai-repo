import { Button, Card, CardContent, CardHeader, CardTitle } from "@hikai/ui";
import { useAuthToken } from "@convex-dev/auth/react";
import { 
  useDebugAuth,
  useListOrganizations, 
  useUserOrganizations,
  useOrganizationsActions 
} from "../hooks/use-organizations-simple";

export function OrganizationsDebug() {
  const clientToken = useAuthToken();
  const authDebug = useDebugAuth();
  const allOrganizations = useListOrganizations();
  const userOrganizations = useUserOrganizations();
  const { createOrganizationSafe, createOrganizationTestSafe } = useOrganizationsActions();

  const createTestOrganization = async () => {
    const testOrg = {
      name: `Test Organization ${Math.floor(Math.random() * 1000)}`,
      slug: `test-org-${Math.floor(Math.random() * 1000)}`,
      description: "This is a test organization created from the debug panel"
    };

    const result = await createOrganizationSafe(testOrg);
    
    if (result.success) {
      console.log("✅ Test organization created successfully:", result.organizationId);
    } else {
      console.error("❌ Error creating test organization:", result.error);
    }
  };

  const createTestOrganizationWithoutAuth = async () => {
    const testOrg = {
      name: `No-Auth Org ${Math.floor(Math.random() * 1000)}`,
      slug: `no-auth-org-${Math.floor(Math.random() * 1000)}`,
      description: "This org was created without authentication check"
    };

    const result = await createOrganizationTestSafe(testOrg);
    
    if (result.success) {
      console.log("✅ No-auth organization created successfully:", result.organizationId);
    } else {
      console.error("❌ Error creating no-auth organization:", result.error);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Debug Panel - Organizations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auth Debug */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
            <h4 className="font-semibold mb-2">🔐 Auth Debug</h4>
            <div className="text-sm space-y-1">
              <div>
                <strong>Client Token:</strong>{' '}
                <span className={clientToken ? "text-green-600" : "text-red-600"}>
                  {clientToken ? "✅ Present" : "❌ Missing"}
                </span>
                {clientToken && (
                  <div className="font-mono text-xs mt-1 p-1 bg-gray-100 dark:bg-gray-800 rounded">
                    {clientToken.substring(0, 20)}...{clientToken.substring(clientToken.length - 10)}
                  </div>
                )}
              </div>
              
              {authDebug === undefined ? (
                <span className="text-yellow-600">Loading server auth info...</span>
              ) : (
                <>
                  <div>
                    <strong>Server Authenticated:</strong>{' '}
                    <span className={authDebug.isAuthenticated ? "text-green-600" : "text-red-600"}>
                      {authDebug.isAuthenticated ? "✅ Yes" : "❌ No"}
                    </span>
                  </div>
                  <div>
                    <strong>Server User ID:</strong>{' '}
                    <span className="font-mono text-xs">{authDebug.userId || "null"}</span>
                  </div>
                  <div>
                    <strong>Server Identity:</strong>{' '}
                    <span className="font-mono text-xs">
                      {authDebug.identity ? JSON.stringify(authDebug.identity) : "null"}
                    </span>
                  </div>
                  <div>
                    <strong>Timestamp:</strong> {new Date(authDebug.timestamp).toLocaleTimeString()}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">All Organizations</h4>
              <div className="text-sm">
                {allOrganizations === undefined ? (
                  <span className="text-yellow-600">Loading...</span>
                ) : (
                  <span className="text-green-600">
                    Loaded: {allOrganizations.length} organizations
                  </span>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">My Organizations</h4>
              <div className="text-sm">
                {userOrganizations === undefined ? (
                  <span className="text-yellow-600">Loading...</span>
                ) : (
                  <span className="text-green-600">
                    Loaded: {userOrganizations.length} my organizations
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={createTestOrganization} variant="outline">
              🧪 Create Test Organization
            </Button>
            <Button onClick={createTestOrganizationWithoutAuth} variant="outline">
              🔓 Create Without Auth
            </Button>
          </div>

          {/* Raw data display for debugging */}
          <details className="text-xs">
            <summary className="cursor-pointer font-medium">Raw Data</summary>
            <div className="mt-2 space-y-2">
              <div>
                <strong>Client Token Info:</strong>
                <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1 overflow-auto">
                  {JSON.stringify({
                    hasToken: !!clientToken,
                    tokenLength: clientToken?.length || 0,
                    tokenType: typeof clientToken,
                    tokenPreview: clientToken ? `${clientToken.substring(0, 10)}...${clientToken.substring(clientToken.length - 10)}` : null
                  }, null, 2)}
                </pre>
              </div>

              <div>
                <strong>Server Auth Debug:</strong>
                <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1 overflow-auto">
                  {JSON.stringify(authDebug, null, 2)}
                </pre>
              </div>

              <div>
                <strong>All Organizations:</strong>
                <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1 overflow-auto">
                  {JSON.stringify(allOrganizations, null, 2)}
                </pre>
              </div>
              
              <div>
                <strong>User Organizations:</strong>
                <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1 overflow-auto">
                  {JSON.stringify(userOrganizations, null, 2)}
                </pre>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}